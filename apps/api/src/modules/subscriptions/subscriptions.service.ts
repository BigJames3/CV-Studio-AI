import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import Stripe from 'stripe';
import { PrismaService } from '../../database/prisma.module';
import { EntitlementsService } from './entitlements.service';
import { CheckoutDto, UpdateSubscriptionDto, CreateSubscriptionDto } from './dto/subscription.dto';

@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name);
  private stripe: Stripe | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly entitlements: EntitlementsService
  ) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (key && !key.includes('xxx')) {
      this.stripe = new Stripe(key, { apiVersion: '2025-02-24.acacia' });
    }
  }

  async me(userId: string) {
    const sub = await this.prisma.subscription.findUnique({
      where: { userId },
      include: { plan: true },
    });
    const tier = await this.entitlements.getTier(userId);
    return {
      subscription: sub,
      tier,
      entitlements: {
        cvCreate: await this.entitlements.can(userId, 'cv:create'),
        aiOptimize: await this.entitlements.can(userId, 'ai:optimize'),
        exportDocx: await this.entitlements.can(userId, 'cv:export:docx'),
      },
    };
  }

  async create(userId: string, dto: CreateSubscriptionDto) {
    const plan = await this.prisma.plan.findUnique({ where: { name: this.planName(dto.plan) } });
    if (!plan) throw new NotFoundException({ code: 'PLAN_NOT_FOUND', message: 'Plan not found' });

    const now = new Date();
    const end = new Date(now);
    end.setFullYear(end.getFullYear() + 100);

    return this.prisma.subscription.upsert({
      where: { userId },
      create: {
        userId,
        planId: plan.id,
        status: 'active',
        currentPeriodStart: now,
        currentPeriodEnd: end,
      },
      update: { planId: plan.id, status: 'active' },
    });
  }

  async update(userId: string, _dto: UpdateSubscriptionDto) {
    return this.me(userId);
  }

  async cancel(userId: string) {
    const sub = await this.prisma.subscription.findUnique({ where: { userId } });
    if (!sub) throw new NotFoundException({ code: 'NOT_FOUND', message: 'No subscription' });

    if (this.stripe && sub.stripeSubscriptionId) {
      await this.stripe.subscriptions.update(sub.stripeSubscriptionId, {
        cancel_at_period_end: true,
      });
    }

    return this.prisma.subscription.update({
      where: { userId },
      data: {
        cancelAtPeriodEnd: true,
        canceledAt: new Date(),
      },
    });
  }

  async checkout(userId: string, dto: CheckoutDto) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
    });
    if (!user) throw new NotFoundException({ code: 'NOT_FOUND', message: 'User not found' });

    const plan = await this.prisma.plan.findUnique({
      where: { name: this.planName(dto.plan) },
    });
    if (!plan) throw new NotFoundException({ code: 'PLAN_NOT_FOUND', message: 'Plan not found' });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
    const successUrl = dto.successUrl ?? `${appUrl}/account/billing?checkout=success`;
    const cancelUrl = dto.cancelUrl ?? `${appUrl}/account/billing?checkout=cancel`;

    if (!this.stripe) {
      const failClosed =
        process.env.NODE_ENV === 'production' || process.env.STRIPE_FAIL_CLOSED === '1';
      if (failClosed) {
        throw new BadRequestException({
          code: 'STRIPE_NOT_CONFIGURED',
          message: 'Stripe is not configured (fail-closed). Checkout unavailable.',
        });
      }
      // Dev fallback: activate plan locally without Stripe
      await this.create(userId, { plan: dto.plan });
      await this.prisma.user.update({
        where: { id: userId },
        data: { subscriptionTier: dto.plan === 'business' ? 'business' : 'pro' },
      });
      return {
        url: successUrl,
        plan: dto.plan,
        interval: dto.interval,
        userId,
        mode: 'dev_bypass',
        message: 'STRIPE_SECRET_KEY missing — plan activated locally for development',
      };
    }

    const priceId = this.resolvePriceId(dto.plan, dto.interval);
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: 'subscription',
      success_url: successUrl,
      cancel_url: cancelUrl,
      client_reference_id: userId,
      customer_email: user.email,
      metadata: { userId, plan: dto.plan, interval: dto.interval },
      subscription_data: {
        metadata: { userId, plan: dto.plan },
      },
    };

    if (priceId) {
      sessionParams.line_items = [{ price: priceId, quantity: 1 }];
    } else {
      const amount =
        dto.interval === 'year'
          ? Math.round(Number(plan.priceYearly) * 100)
          : Math.round(Number(plan.priceMonthly) * 100);
      sessionParams.line_items = [
        {
          quantity: 1,
          price_data: {
            currency: 'usd',
            unit_amount: amount,
            recurring: { interval: dto.interval },
            product_data: {
              name: `CV Studio AI ${plan.name}`,
              description: plan.description,
            },
          },
        },
      ];
    }

    const session = await this.stripe.checkout.sessions.create(sessionParams);
    if (!session.url) {
      throw new BadRequestException({
        code: 'CHECKOUT_FAILED',
        message: 'Stripe did not return a checkout URL',
      });
    }

    return {
      url: session.url,
      plan: dto.plan,
      interval: dto.interval,
      userId,
      sessionId: session.id,
    };
  }

  async applyStripeSubscription(params: {
    userId: string;
    planName: string;
    stripeSubscriptionId: string;
    status: string;
    currentPeriodStart: Date;
    currentPeriodEnd: Date;
  }) {
    const statusMap: Record<string, 'active' | 'canceled' | 'past_due' | 'trialing'> = {
      active: 'active',
      trialing: 'trialing',
      past_due: 'past_due',
      canceled: 'canceled',
      unpaid: 'past_due',
    };

    const mappedStatus = statusMap[params.status] ?? 'active';
    const isCanceled = mappedStatus === 'canceled';
    const tier =
      isCanceled || params.planName.toLowerCase() === 'free'
        ? 'free'
        : params.planName.toLowerCase() === 'business'
          ? 'business'
          : params.planName.toLowerCase() === 'pro'
            ? 'pro'
            : 'free';

    const planName = tier === 'free' ? 'Free' : this.planName(tier);
    const plan = await this.prisma.plan.findUnique({ where: { name: planName } });
    if (!plan) {
      this.logger.warn(`Plan not found for Stripe sync: ${planName}`);
      return;
    }

    await this.prisma.subscription.upsert({
      where: { userId: params.userId },
      create: {
        userId: params.userId,
        planId: plan.id,
        status: mappedStatus,
        currentPeriodStart: params.currentPeriodStart,
        currentPeriodEnd: params.currentPeriodEnd,
        stripeSubscriptionId: params.stripeSubscriptionId,
        canceledAt: isCanceled ? new Date() : null,
      },
      update: {
        planId: plan.id,
        status: mappedStatus,
        currentPeriodStart: params.currentPeriodStart,
        currentPeriodEnd: params.currentPeriodEnd,
        stripeSubscriptionId: params.stripeSubscriptionId,
        cancelAtPeriodEnd: false,
        canceledAt: isCanceled ? new Date() : null,
      },
    });

    await this.prisma.user.update({
      where: { id: params.userId },
      data: {
        subscriptionTier: tier,
        subscriptionStartDate: params.currentPeriodStart,
        subscriptionEndDate: params.currentPeriodEnd,
      },
    });
  }

  private resolvePriceId(plan: string, interval: string): string | undefined {
    const key = `STRIPE_PRICE_${plan.toUpperCase()}_${interval === 'year' ? 'YEARLY' : 'MONTHLY'}`;
    return process.env[key] || undefined;
  }

  private planName(plan: string) {
    return plan.charAt(0).toUpperCase() + plan.slice(1);
  }
}

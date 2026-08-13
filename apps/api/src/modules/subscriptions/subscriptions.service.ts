import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import Stripe from 'stripe';
import { PrismaService } from '../../database/prisma.module';
import { EntitlementsService } from './entitlements.service';
import { MailService } from '../../mail/mail.service';
import { EmailService } from '../email/email.service';
import { CheckoutDto, UpdateSubscriptionDto, CreateSubscriptionDto } from './dto/subscription.dto';
import { AnalyticsEventsService } from '../analytics/analytics-events.service';

@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name);
  private stripe: Stripe | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly entitlements: EntitlementsService,
    private readonly mail: MailService,
    private readonly emailService: EmailService,
    private readonly analyticsEvents: AnalyticsEventsService
  ) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (key && !key.includes('xxx')) {
      this.stripe = new Stripe(key, { apiVersion: '2025-02-24.acacia' });
    }
  }

  async me(userId: string) {
    const [sub, user] = await Promise.all([
      this.prisma.subscription.findUnique({
        where: { userId },
        include: { plan: true },
      }),
      this.prisma.user.findFirst({
        where: { id: userId, deletedAt: null },
        select: { subscriptionTier: true, subscriptionEndDate: true },
      }),
    ]);
    const tier = await this.entitlements.getTier(userId);
    const cancelAtPeriodEnd = Boolean(sub?.cancelAtPeriodEnd);
    const currentPeriodEnd =
      sub?.currentPeriodEnd?.toISOString() ?? user?.subscriptionEndDate?.toISOString() ?? null;
    const status = this.resolveBillingStatus({
      tier,
      subscriptionStatus: sub?.status ?? null,
      cancelAtPeriodEnd,
    });

    return {
      subscription: sub,
      tier,
      status,
      cancelAtPeriodEnd,
      currentPeriodEnd,
      subscriptionEndDate: currentPeriodEnd,
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

  async reactivate(userId: string) {
    const [sub, user] = await Promise.all([
      this.prisma.subscription.findUnique({
        where: { userId },
        include: { plan: true },
      }),
      this.prisma.user.findFirst({
        where: { id: userId, deletedAt: null },
        select: {
          email: true,
          firstName: true,
          lastName: true,
          subscriptionTier: true,
          stripeCustomerId: true,
        },
      }),
    ]);

    if (!sub) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'No subscription' });
    }
    if (!user) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'User not found' });
    }

    // Already active — idempotent success
    if (!sub.cancelAtPeriodEnd) {
      return { ...(await this.me(userId)), reactivated: false, alreadyActive: true };
    }

    // Fully ended: cannot undo cancel_at_period_end — client should start checkout
    if (sub.status === 'canceled') {
      throw new BadRequestException({
        code: 'SUBSCRIPTION_ENDED',
        message: 'Subscription already ended. Start a new checkout to resubscribe.',
        action: 'checkout_required',
      });
    }

    let stripeSubscriptionId = sub.stripeSubscriptionId;

    if (this.stripe) {
      // Resolve Stripe subscription if local id is missing
      if (!stripeSubscriptionId && user.stripeCustomerId) {
        const active = await this.stripe.subscriptions.list({
          customer: user.stripeCustomerId,
          status: 'active',
          limit: 1,
        });
        if (active.data[0]) {
          stripeSubscriptionId = active.data[0].id;
        } else {
          const trialing = await this.stripe.subscriptions.list({
            customer: user.stripeCustomerId,
            status: 'trialing',
            limit: 1,
          });
          stripeSubscriptionId = trialing.data[0]?.id ?? null;
        }
      }

      if (!stripeSubscriptionId) {
        throw new BadRequestException({
          code: 'STRIPE_SUBSCRIPTION_MISSING',
          message: 'No active Stripe subscription to reactivate.',
          action: 'checkout_required',
        });
      }

      // Correct path for cancel_at_period_end: do NOT create a second subscription
      await this.stripe.subscriptions.update(stripeSubscriptionId, {
        cancel_at_period_end: false,
      });
    } else {
      const failClosed =
        process.env.NODE_ENV === 'production' || process.env.STRIPE_FAIL_CLOSED === '1';
      if (failClosed) {
        throw new BadRequestException({
          code: 'STRIPE_NOT_CONFIGURED',
          message: 'Stripe is not configured. Reactivation unavailable.',
        });
      }
    }

    await this.prisma.subscription.update({
      where: { userId },
      data: {
        cancelAtPeriodEnd: false,
        canceledAt: null,
        status: sub.status === 'past_due' ? 'past_due' : 'active',
        ...(stripeSubscriptionId ? { stripeSubscriptionId } : {}),
      },
    });

    const planName = sub.plan?.name ?? user.subscriptionTier ?? 'pro';
    const displayName = [user.firstName, user.lastName].filter(Boolean).join(' ').trim() || 'there';
    const resend = await this.emailService.sendReactivationConfirmationEmail(
      user.email,
      displayName,
      planName
    );
    // Fallback to SMTP transactional mail when Resend is not configured
    if (resend.messageId === 'logged-only') {
      await this.mail.sendSubscriptionReactivated(user.email, { plan: planName });
    }
    this.logger.log(`Subscription reactivated for user ${userId}`);
    this.analyticsEvents.trackSubscriptionReactivated(userId, planName);

    return { ...(await this.me(userId)), reactivated: true, alreadyActive: false };
  }

  async checkout(userId: string, dto: CheckoutDto) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
    });
    if (!user) throw new NotFoundException({ code: 'NOT_FOUND', message: 'User not found' });

    this.analyticsEvents.trackUpgradeClicked(userId, dto.plan, dto.interval);

    const plan = await this.prisma.plan.findUnique({
      where: { name: this.planName(dto.plan) },
    });
    if (!plan) throw new NotFoundException({ code: 'PLAN_NOT_FOUND', message: 'Plan not found' });

    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_URL ?? 'http://localhost:3000';
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

    const customerId = await this.ensureStripeCustomer(user);
    const priceId = this.resolvePriceId(dto.plan, dto.interval);
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: 'subscription',
      success_url: successUrl,
      cancel_url: cancelUrl,
      client_reference_id: userId,
      customer: customerId,
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

  async createBillingPortalSession(userId: string, returnUrl?: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
    });
    if (!user) throw new NotFoundException({ code: 'NOT_FOUND', message: 'User not found' });

    if (!this.stripe) {
      throw new BadRequestException({
        code: 'STRIPE_NOT_CONFIGURED',
        message: 'Stripe is not configured. Billing portal unavailable.',
      });
    }

    const customerId = user.stripeCustomerId ?? (await this.ensureStripeCustomer(user));
    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_URL ?? 'http://localhost:3000';

    const session = await this.stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl ?? `${appUrl}/account/billing`,
    });

    this.analyticsEvents.trackPortalAccessed(userId);
    return { url: session.url };
  }

  async applyStripeSubscription(params: {
    userId: string;
    planName: string;
    stripeSubscriptionId: string;
    status: string;
    currentPeriodStart: Date;
    currentPeriodEnd: Date;
    stripeCustomerId?: string | null;
    cancelAtPeriodEnd?: boolean;
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
    const cancelAtPeriodEnd = params.cancelAtPeriodEnd ?? false;
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
        cancelAtPeriodEnd,
        canceledAt: isCanceled || cancelAtPeriodEnd ? new Date() : null,
      },
      update: {
        planId: plan.id,
        status: mappedStatus,
        currentPeriodStart: params.currentPeriodStart,
        currentPeriodEnd: params.currentPeriodEnd,
        stripeSubscriptionId: params.stripeSubscriptionId,
        cancelAtPeriodEnd,
        canceledAt: isCanceled || cancelAtPeriodEnd ? new Date() : null,
      },
    });

    await this.prisma.user.update({
      where: { id: params.userId },
      data: {
        subscriptionTier: tier,
        subscriptionStartDate: params.currentPeriodStart,
        subscriptionEndDate: params.currentPeriodEnd,
        ...(params.stripeCustomerId ? { stripeCustomerId: params.stripeCustomerId } : {}),
      },
    });
  }

  private async ensureStripeCustomer(user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    stripeCustomerId: string | null;
  }): Promise<string> {
    if (user.stripeCustomerId) return user.stripeCustomerId;
    if (!this.stripe) {
      throw new BadRequestException({
        code: 'STRIPE_NOT_CONFIGURED',
        message: 'Stripe is not configured',
      });
    }

    const customer = await this.stripe.customers.create({
      email: user.email,
      name: [user.firstName, user.lastName].filter(Boolean).join(' ') || undefined,
      metadata: { userId: user.id },
    });

    await this.prisma.user.update({
      where: { id: user.id },
      data: { stripeCustomerId: customer.id },
    });

    return customer.id;
  }

  private resolvePriceId(plan: string, interval: string): string | undefined {
    const prefix = `STRIPE_PRICE_${plan.toUpperCase()}_`;
    if (interval === 'year') {
      return process.env[`${prefix}YEARLY`] || process.env[`${prefix}ANNUAL`] || undefined;
    }
    return process.env[`${prefix}MONTHLY`] || undefined;
  }

  private resolveBillingStatus(params: {
    tier: string;
    subscriptionStatus: string | null;
    cancelAtPeriodEnd: boolean;
  }): 'free' | 'active' | 'canceling' | 'past_due' | 'canceled' {
    if (params.tier === 'free') {
      return params.subscriptionStatus === 'canceled' ? 'canceled' : 'free';
    }
    if (params.subscriptionStatus === 'past_due') return 'past_due';
    if (params.subscriptionStatus === 'canceled') return 'canceled';
    if (params.cancelAtPeriodEnd) return 'canceling';
    return 'active';
  }

  private planName(plan: string) {
    return plan.charAt(0).toUpperCase() + plan.slice(1);
  }
}

import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  ServiceUnavailableException,
  Optional,
  Inject,
  forwardRef,
} from '@nestjs/common';
import Stripe from 'stripe';
import { PrismaService } from '../../database/prisma.module';
import { EntitlementsService } from './entitlements.service';
import { CheckoutDto, UpdateSubscriptionDto, CreateSubscriptionDto } from './dto/subscription.dto';
import { CinetpayGateway } from '../payments/gateways/cinetpay.gateway';
import { appOriginFromEnv, safeReturnUrl } from '../../common/utils/url.utils';
import { STRIPE_TRIAL_DAYS } from '../plans/plan-catalog';

function isStripeFailClosed() {
  return process.env.NODE_ENV === 'production' || process.env.STRIPE_FAIL_CLOSED === '1';
}

@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name);
  private stripe: Stripe | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly entitlements: EntitlementsService,
    @Optional()
    @Inject(forwardRef(() => CinetpayGateway))
    private readonly cinetpayGateway?: CinetpayGateway
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
        exportPdf: await this.entitlements.can(userId, 'cv:export:pdf'),
        print: await this.entitlements.can(userId, 'cv:print'),
        share: await this.entitlements.can(userId, 'cv:share'),
        proTemplates: await this.entitlements.can(userId, 'proTemplates'),
        businessTemplates: await this.entitlements.can(userId, 'businessTemplates'),
        advancedFeatures: await this.entitlements.can(userId, 'advancedFeatures'),
        aiOptimize: await this.entitlements.can(userId, 'ai:optimize'),
        exportDocx: await this.entitlements.can(userId, 'cv:export:docx'),
      },
    };
  }

  /**
   * Internal only (Stripe fail-open / CinetPay placeholder). Paid entitlements
   * must be granted via applyPaidEntitlement after a verified webhook.
   */
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

  /** Immediate Stripe cancel for account erasure (GDPR). Does not throw if Stripe is down. */
  async cancelImmediately(userId: string): Promise<{
    hadSubscription: boolean;
    stripeCanceled: boolean;
  }> {
    const sub = await this.prisma.subscription.findUnique({ where: { userId } });
    let stripeCanceled = false;

    if (sub?.stripeSubscriptionId && this.stripe) {
      try {
        await this.stripe.subscriptions.cancel(sub.stripeSubscriptionId);
        stripeCanceled = true;
      } catch (error) {
        this.logger.error(
          `Immediate Stripe cancel failed for user ${userId}`,
          error instanceof Error ? error.stack : error
        );
      }
    }

    if (sub) {
      await this.prisma.subscription.update({
        where: { userId },
        data: {
          status: 'canceled',
          cancelAtPeriodEnd: false,
          canceledAt: new Date(),
        },
      });
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        subscriptionTier: 'free',
        subscriptionEndDate: new Date(),
      },
    });

    return { hadSubscription: Boolean(sub), stripeCanceled };
  }

  async checkout(userId: string, dto: CheckoutDto) {
    const paymentMethod = dto.paymentMethod ?? 'stripe';

    if (paymentMethod === 'cinetpay') {
      return this.checkoutCinetpay(userId, dto);
    }

    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
    });
    if (!user) throw new NotFoundException({ code: 'NOT_FOUND', message: 'User not found' });

    const plan = await this.prisma.plan.findUnique({
      where: { name: this.planName(dto.plan) },
    });
    if (!plan) throw new NotFoundException({ code: 'PLAN_NOT_FOUND', message: 'Plan not found' });

    const appUrl = appOriginFromEnv();
    const successUrl = safeReturnUrl(
      dto.successUrl,
      `${appUrl}/account/billing?checkout=success`,
      appUrl
    );
    const cancelUrl = safeReturnUrl(
      dto.cancelUrl,
      `${appUrl}/account/billing?checkout=cancel`,
      appUrl
    );

    if (!this.stripe) {
      if (isStripeFailClosed()) {
        throw new ServiceUnavailableException({
          code: 'STRIPE_NOT_CONFIGURED',
          message:
            'Stripe is not configured (fail-closed). Checkout unavailable. Set STRIPE_FAIL_CLOSED=1 and STRIPE_SECRET_KEY in production.',
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

    const trialEligible = await this.isEligibleForStripeTrial(
      userId,
      user.subscriptionTier ?? 'free'
    );
    const trialFields: Record<string, string> = trialEligible
      ? { trial_days: String(STRIPE_TRIAL_DAYS) }
      : {};
    const priceId = this.resolvePriceId(dto.plan, dto.interval);
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: 'subscription',
      success_url: successUrl,
      cancel_url: cancelUrl,
      client_reference_id: userId,
      customer_email: user.email,
      metadata: { userId, plan: dto.plan, interval: dto.interval, ...trialFields },
      subscription_data: {
        metadata: { userId, plan: dto.plan, ...trialFields },
        ...(trialEligible ? { trial_period_days: STRIPE_TRIAL_DAYS } : {}),
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

  async applyPaidEntitlement(params: {
    userId: string;
    plan: string;
    provider: 'stripe' | 'cinetpay';
    status?: string;
    periodEnd: Date;
    periodStart?: Date;
    stripeSubscriptionId?: string;
    cinetpayTransactionId?: string;
    cancelAtPeriodEnd?: boolean;
  }) {
    const statusMap: Record<string, 'active' | 'canceled' | 'past_due' | 'trialing'> = {
      active: 'active',
      trialing: 'trialing',
      past_due: 'past_due',
      canceled: 'canceled',
      unpaid: 'past_due',
    };

    const mappedStatus = statusMap[params.status ?? 'active'] ?? 'active';
    const isCanceled = mappedStatus === 'canceled';
    const cancelAtPeriodEnd = Boolean(params.cancelAtPeriodEnd) && !isCanceled;
    const periodStart = params.periodStart ?? new Date();
    const tier =
      isCanceled || params.plan.toLowerCase() === 'free'
        ? 'free'
        : params.plan.toLowerCase() === 'business'
          ? 'business'
          : params.plan.toLowerCase() === 'pro'
            ? 'pro'
            : null;

    if (!tier) {
      throw new Error(
        `Unknown plan for ${params.provider} sync: ${params.plan}. ` +
          `Please ensure STRIPE_PRICE_PRO_* and STRIPE_PRICE_BUSINESS_* are configured correctly.`
      );
    }

    const planName = tier === 'free' ? 'Free' : this.planName(tier);
    const plan = await this.prisma.plan.findUnique({ where: { name: planName } });
    if (!plan) {
      throw new Error(
        `Unknown plan for ${params.provider} sync: ${planName}. Seed the plans table before processing webhooks.`
      );
    }

    const providerIds = {
      ...(params.stripeSubscriptionId !== undefined
        ? { stripeSubscriptionId: params.stripeSubscriptionId }
        : {}),
      ...(params.cinetpayTransactionId !== undefined
        ? { cinetpayTransactionId: params.cinetpayTransactionId }
        : {}),
    };

    const subscription = await this.prisma.subscription.upsert({
      where: { userId: params.userId },
      create: {
        userId: params.userId,
        planId: plan.id,
        status: mappedStatus,
        provider: params.provider,
        currentPeriodStart: periodStart,
        currentPeriodEnd: params.periodEnd,
        lastPaymentError: null,
        cancelAtPeriodEnd,
        canceledAt: isCanceled || cancelAtPeriodEnd ? new Date() : null,
        ...providerIds,
      } as never,
      update: {
        planId: plan.id,
        status: mappedStatus,
        provider: params.provider,
        currentPeriodStart: periodStart,
        currentPeriodEnd: params.periodEnd,
        lastPaymentError: null,
        cancelAtPeriodEnd,
        canceledAt: isCanceled || cancelAtPeriodEnd ? new Date() : null,
        ...providerIds,
      } as never,
    });

    await this.prisma.user.update({
      where: { id: params.userId },
      data: {
        subscriptionTier: tier,
        subscriptionStartDate: periodStart,
        subscriptionEndDate: params.periodEnd,
      },
    });

    this.logger.log(`Entitlement granted: ${params.userId} → ${tier} (via ${params.provider})`);
    return subscription;
  }

  /** @deprecated Prefer applyPaidEntitlement — kept for Stripe call-site compatibility. */
  async applyStripeSubscription(params: {
    userId: string;
    planName: string;
    stripeSubscriptionId: string;
    status: string;
    currentPeriodStart: Date;
    currentPeriodEnd: Date;
    cancelAtPeriodEnd?: boolean;
  }) {
    return this.applyPaidEntitlement({
      userId: params.userId,
      plan: params.planName,
      provider: 'stripe',
      status: params.status,
      periodStart: params.currentPeriodStart,
      periodEnd: params.currentPeriodEnd,
      stripeSubscriptionId: params.stripeSubscriptionId,
      cancelAtPeriodEnd: params.cancelAtPeriodEnd,
    });
  }

  private async checkoutCinetpay(userId: string, dto: CheckoutDto) {
    if (!this.cinetpayGateway) {
      throw new BadRequestException({
        code: 'CINETPAY_NOT_CONFIGURED',
        message: 'CinetPay is not configured in this environment',
      });
    }

    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
    });
    if (!user) throw new NotFoundException({ code: 'NOT_FOUND', message: 'User not found' });

    const plan = await this.prisma.plan.findUnique({
      where: { name: this.planName(dto.plan) },
    });
    if (!plan) throw new NotFoundException({ code: 'PLAN_NOT_FOUND', message: 'Plan not found' });

    const now = new Date();
    const subscription = await this.prisma.subscription.upsert({
      where: { userId },
      create: {
        userId,
        planId: plan.id,
        status: 'trialing',
        currentPeriodStart: now,
        currentPeriodEnd: now,
      },
      update: {},
    });

    return this.cinetpayGateway.createPayment(userId, {
      plan: dto.plan,
      interval: dto.interval,
      subscriptionId: subscription.id,
      returnUrl: dto.successUrl,
    });
  }

  private resolvePriceId(plan: string, interval: string): string | undefined {
    const key = `STRIPE_PRICE_${plan.toUpperCase()}_${interval === 'year' ? 'YEARLY' : 'MONTHLY'}`;
    return process.env[key] || undefined;
  }

  private planName(plan: string) {
    return plan.charAt(0).toUpperCase() + plan.slice(1);
  }

  /**
   * First-time Stripe Checkout only. Returning paid/trialing Stripe customers
   * and completed CinetPay periods are excluded. The CinetPay unpaid placeholder
   * (trialing, no provider charge id) does not consume the trial.
   */
  private async isEligibleForStripeTrial(
    userId: string,
    subscriptionTier: string
  ): Promise<boolean> {
    if (subscriptionTier === 'pro' || subscriptionTier === 'business') {
      return false;
    }

    const sub = await this.prisma.subscription.findUnique({
      where: { userId },
      include: { plan: true },
    });
    if (!sub) return true;
    if (sub.stripeSubscriptionId) return false;

    const paidPlan = sub.plan?.name !== 'Free';
    if (!paidPlan) return true;

    if (sub.status === 'active' || sub.status === 'past_due' || sub.status === 'canceled') {
      return false;
    }

    if (sub.status === 'trialing' && sub.provider === 'stripe') {
      return false;
    }

    return true;
  }
}

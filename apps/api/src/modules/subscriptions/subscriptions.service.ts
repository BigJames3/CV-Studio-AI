import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  Optional,
  Inject,
  forwardRef,
  ServiceUnavailableException,
} from '@nestjs/common';
import Stripe from 'stripe';
import { PrismaService } from '../../database/prisma.module';
import { EntitlementsService } from './entitlements.service';
import { CheckoutDto, UpdateSubscriptionDto, CreateSubscriptionDto } from './dto/subscription.dto';
import { CinetpayGateway } from '../payments/gateways/cinetpay.gateway';
import {
  expandableStripeId,
  isNonPlaceholderSecret,
  isStripeLiveAllowed,
  isStripeLiveSecret,
  stripeSecretForClient,
} from '../payments/payment-env';
import { TRIAL_PERIOD_DAYS } from '../plans/plans.service';
import { appOriginFromEnv, safeReturnUrl } from '../../common/utils/url.utils';

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
    const key = stripeSecretForClient();
    if (key) {
      this.stripe = new Stripe(key, { apiVersion: '2025-02-24.acacia' });
    }
  }

  async me(userId: string) {
    const sub = await this.prisma.subscription.findUnique({
      where: { userId },
      include: { plan: true },
    });
    const snap = await this.entitlements.snapshot(userId);
    return {
      subscription: sub,
      tier: snap.tier,
      entitlements: snap.entitlements,
      cvCount: snap.cvCount,
      cvLimit: snap.cvLimit,
      cvRemaining: snap.cvRemaining,
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

    if (
      !(await this.prisma.plan.findUnique({
        where: { name: this.planName(dto.plan) },
      }))
    ) {
      throw new NotFoundException({ code: 'PLAN_NOT_FOUND', message: 'Plan not found' });
    }

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

    if (isStripeLiveSecret(process.env.STRIPE_SECRET_KEY) && !isStripeLiveAllowed()) {
      throw new BadRequestException({
        code: 'STRIPE_LIVE_KEY_BLOCKED',
        message:
          'Live Stripe keys are blocked. Use sk_test_ keys, or set STRIPE_ALLOW_LIVE=1 for production go-live.',
      });
    }

    if (!this.stripe) {
      throw new BadRequestException({
        code: 'STRIPE_NOT_CONFIGURED',
        message: 'Stripe is not configured (fail-closed). Checkout unavailable.',
      });
    }

    const existingSub = await this.prisma.subscription.findUnique({ where: { userId } });
    const grantTrial =
      (user.subscriptionTier ?? 'free') === 'free' && !existingSub?.stripeSubscriptionId;

    const priceId = this.requirePriceId(dto.plan, dto.interval);
    const stripeCustomerId = await this.ensureStripeCustomerId(userId, user.email, existingSub);

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: 'subscription',
      success_url: successUrl,
      cancel_url: cancelUrl,
      client_reference_id: userId,
      customer: stripeCustomerId,
      metadata: { userId, plan: dto.plan, interval: dto.interval },
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: {
        metadata: {
          userId,
          plan: dto.plan,
          ...(grantTrial ? { trial_days: String(TRIAL_PERIOD_DAYS) } : {}),
        },
        ...(grantTrial ? { trial_period_days: TRIAL_PERIOD_DAYS } : {}),
      },
    };

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
    stripeCustomerId?: string;
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
      ...(params.stripeCustomerId !== undefined
        ? { stripeCustomerId: params.stripeCustomerId }
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
    stripeCustomerId?: string;
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
      stripeCustomerId: params.stripeCustomerId,
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

  private requirePriceId(plan: string, interval: string): string {
    const priceId = this.resolvePriceId(plan, interval);
    if (!priceId) {
      this.logger.error(
        `Missing STRIPE_PRICE_${plan.toUpperCase()}_* for interval=${interval}. Failing checkout.`
      );
      throw new ServiceUnavailableException({
        code: 'STRIPE_PRICE_NOT_CONFIGURED',
        message: 'Stripe prices not configured. Contact support.',
      });
    }
    return priceId;
  }

  private resolvePriceId(plan: string, interval: string): string | undefined {
    const suffixes = interval === 'year' ? ['YEARLY', 'ANNUAL'] : ['MONTHLY'];
    for (const suffix of suffixes) {
      const raw = process.env[`STRIPE_PRICE_${plan.toUpperCase()}_${suffix}`];
      if (isNonPlaceholderSecret(raw)) return raw;
    }
    return undefined;
  }

  /**
   * Reuse the persisted Stripe customer, recover it from an existing Stripe
   * subscription, or create one. Never pass customer_email (that mints duplicates).
   */
  private async ensureStripeCustomerId(
    userId: string,
    email: string,
    existing: { stripeCustomerId?: string | null; stripeSubscriptionId?: string | null } | null
  ): Promise<string> {
    const stripe = this.stripe!;
    if (existing?.stripeCustomerId) {
      return existing.stripeCustomerId;
    }

    if (existing?.stripeSubscriptionId) {
      try {
        const stripeSub = await stripe.subscriptions.retrieve(existing.stripeSubscriptionId);
        const fromSub = expandableStripeId(stripeSub.customer);
        if (fromSub) {
          await this.persistStripeCustomerId(userId, fromSub, existing);
          return fromSub;
        }
      } catch (error) {
        this.logger.warn(
          `Could not recover Stripe customer from subscription ${existing.stripeSubscriptionId}`,
          error instanceof Error ? error.stack : error
        );
      }
    }

    const listed = await stripe.customers.list({ email, limit: 10 });
    const owned = listed.data.find((c) => c.metadata?.userId === userId);
    const untagged = listed.data.find((c) => !c.metadata?.userId);
    const reused = owned ?? untagged;
    if (reused) {
      if (!reused.metadata?.userId) {
        await stripe.customers.update(reused.id, { metadata: { userId } });
      }
      await this.persistStripeCustomerId(userId, reused.id, existing);
      return reused.id;
    }

    const customer = await stripe.customers.create({
      email,
      metadata: { userId },
    });
    await this.persistStripeCustomerId(userId, customer.id, existing);
    return customer.id;
  }

  private async persistStripeCustomerId(
    userId: string,
    stripeCustomerId: string,
    existing: { stripeCustomerId?: string | null } | null
  ): Promise<void> {
    if (existing) {
      await this.prisma.subscription.update({
        where: { userId },
        data: { stripeCustomerId },
      });
      return;
    }

    const freePlan = await this.prisma.plan.findUnique({ where: { name: 'Free' } });
    if (!freePlan) {
      throw new NotFoundException({ code: 'PLAN_NOT_FOUND', message: 'Plan not found' });
    }

    const now = new Date();
    const end = new Date(now);
    end.setFullYear(end.getFullYear() + 100);

    await this.prisma.subscription.create({
      data: {
        userId,
        planId: freePlan.id,
        status: 'active',
        currentPeriodStart: now,
        currentPeriodEnd: end,
        stripeCustomerId,
      },
    });
  }

  private planName(plan: string) {
    return plan.charAt(0).toUpperCase() + plan.slice(1);
  }
}

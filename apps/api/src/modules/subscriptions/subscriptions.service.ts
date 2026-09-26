import {
  Injectable,
  Logger,
  BadRequestException,
  ConflictException,
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

type PaidPlan = 'pro' | 'business';
type BillingInterval = 'month' | 'year';

/** Stripe statuses that still bill (or will bill) the customer. */
const LIVE_STRIPE_STATUSES = new Set<Stripe.Subscription.Status>([
  'active',
  'trialing',
  'past_due',
  'unpaid',
  'incomplete',
]);

const PLAN_RANK: Record<PaidPlan, number> = { pro: 1, business: 2 };

/** An upgrade costs more right away: higher tier, or same tier from monthly to yearly. */
function isUpgrade(
  from: { plan: PaidPlan; interval: BillingInterval },
  to: { plan: PaidPlan; interval: BillingInterval }
): boolean {
  if (PLAN_RANK[to.plan] !== PLAN_RANK[from.plan]) {
    return PLAN_RANK[to.plan] > PLAN_RANK[from.plan];
  }
  return from.interval === 'month' && to.interval === 'year';
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
    const priceId = this.requirePriceId(dto.plan, dto.interval);

    // One Stripe subscription per user: a subscriber changes plan in place instead of
    // opening a second Checkout (which would bill both subscriptions).
    const liveSub = await this.findLiveStripeSubscription(existingSub?.stripeSubscriptionId);
    if (liveSub) {
      return this.changeStripePlan(userId, liveSub, dto, priceId, successUrl);
    }

    const grantTrial =
      (user.subscriptionTier ?? 'free') === 'free' && !existingSub?.stripeSubscriptionId;

    const stripeCustomerId = await this.ensureStripeCustomerId(userId, user.email, existingSub);
    await this.expireOpenCheckoutSessions(stripeCustomerId, userId);

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

    const existing = await this.prisma.subscription.findUnique({ where: { userId } });
    if (await this.findLiveStripeSubscription(existing?.stripeSubscriptionId)) {
      throw new ConflictException({
        code: 'STRIPE_SUBSCRIPTION_ACTIVE',
        message:
          'You already have an active card subscription. Change plan with your card, or cancel it first.',
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

  /** The user's Stripe subscription if it still bills; `null` if there is none or it ended. */
  private async findLiveStripeSubscription(
    stripeSubscriptionId?: string | null
  ): Promise<Stripe.Subscription | null> {
    if (!stripeSubscriptionId || !this.stripe) return null;
    let sub: Stripe.Subscription | undefined;
    try {
      sub = await this.stripe.subscriptions.retrieve(stripeSubscriptionId);
    } catch (error) {
      if ((error as { code?: string } | null)?.code === 'resource_missing') return null;
      this.logger.error(
        `Could not load Stripe subscription ${stripeSubscriptionId}`,
        error instanceof Error ? error.stack : error
      );
      // Fail closed: without knowing the current subscription we could bill twice.
      throw new ServiceUnavailableException({
        code: 'STRIPE_UNAVAILABLE',
        message: 'Could not verify your current subscription. Please try again later.',
      });
    }
    return sub && LIVE_STRIPE_STATUSES.has(sub.status) ? sub : null;
  }

  /**
   * Switch an existing Stripe subscription to another price. Upgrades are invoiced now and
   * only applied once paid (`pending_if_incomplete`); downgrades credit the difference on the
   * next invoice. Re-selecting the current plan resumes a scheduled cancellation.
   */
  private async changeStripePlan(
    userId: string,
    current: Stripe.Subscription,
    dto: CheckoutDto,
    priceId: string,
    successUrl: string
  ) {
    if (current.status !== 'active' && current.status !== 'trialing') {
      throw new ConflictException({
        code: 'SUBSCRIPTION_PAYMENT_ISSUE',
        message:
          'Your current subscription has an unpaid invoice. Update your payment method before changing plan.',
      });
    }

    const stripe = this.stripe!;
    const item = current.items?.data?.[0];
    if (!item) {
      throw new ServiceUnavailableException({
        code: 'STRIPE_SUBSCRIPTION_INVALID',
        message: 'Your current subscription could not be updated. Contact support.',
      });
    }
    const result = {
      plan: dto.plan,
      interval: dto.interval,
      userId,
      subscriptionId: current.id,
    };

    if (item.price?.id === priceId) {
      if (!current.cancel_at_period_end) {
        throw new ConflictException({
          code: 'ALREADY_SUBSCRIBED',
          message: 'You are already subscribed to this plan.',
        });
      }
      const resumed = await stripe.subscriptions.update(current.id, {
        cancel_at_period_end: false,
      });
      await this.syncStripeSubscription(userId, dto.plan, resumed);
      return { ...result, url: successUrl, mode: 'resumed' };
    }

    const from = this.planFromPriceId(item.price?.id);
    const upgrade = !from || isUpgrade(from, { plan: dto.plan, interval: dto.interval });
    const trialing = current.status === 'trialing';
    const updated = await stripe.subscriptions.update(current.id, {
      items: [{ id: item.id, price: priceId }],
      proration_behavior: trialing ? 'none' : upgrade ? 'always_invoice' : 'create_prorations',
      ...(upgrade && !trialing ? { payment_behavior: 'pending_if_incomplete' as const } : {}),
      expand: ['latest_invoice'],
    });

    if (updated.pending_update) {
      // Payment needs the customer (3-D Secure, declined card): Stripe keeps the old plan
      // until the invoice is paid, then sends customer.subscription.updated.
      const invoice =
        updated.latest_invoice && typeof updated.latest_invoice === 'object'
          ? updated.latest_invoice
          : null;
      return {
        ...result,
        url: invoice?.hosted_invoice_url ?? successUrl,
        mode: 'payment_required',
      };
    }

    // Changing plan means staying: keep metadata in line and drop a scheduled cancellation.
    const final = await stripe.subscriptions.update(current.id, {
      metadata: { ...updated.metadata, plan: dto.plan },
      ...(updated.cancel_at_period_end ? { cancel_at_period_end: false } : {}),
    });
    await this.syncStripeSubscription(userId, dto.plan, final);
    return { ...result, url: successUrl, mode: 'updated' };
  }

  private async syncStripeSubscription(userId: string, plan: PaidPlan, sub: Stripe.Subscription) {
    await this.applyPaidEntitlement({
      userId,
      plan,
      provider: 'stripe',
      status: sub.status,
      periodStart: new Date(sub.current_period_start * 1000),
      periodEnd: new Date(sub.current_period_end * 1000),
      stripeSubscriptionId: sub.id,
      stripeCustomerId: expandableStripeId(sub.customer),
      cancelAtPeriodEnd: Boolean(sub.cancel_at_period_end),
    });
  }

  private planFromPriceId(
    priceId?: string | null
  ): { plan: PaidPlan; interval: BillingInterval } | null {
    if (!priceId) return null;
    for (const plan of ['pro', 'business'] as const) {
      for (const interval of ['month', 'year'] as const) {
        if (this.resolvePriceId(plan, interval) === priceId) return { plan, interval };
      }
    }
    return null;
  }

  /** Two open Checkout tabs could each create a subscription: keep only the newest one. */
  private async expireOpenCheckoutSessions(customerId: string, userId: string): Promise<void> {
    try {
      const open = await this.stripe!.checkout.sessions.list({
        customer: customerId,
        status: 'open',
        limit: 10,
      });
      await Promise.all(
        open.data
          .filter((session) => session.mode === 'subscription')
          .map((session) => this.stripe!.checkout.sessions.expire(session.id))
      );
    } catch (error) {
      this.logger.warn(
        `Could not expire open Checkout sessions for user ${userId}`,
        error instanceof Error ? error.stack : error
      );
    }
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

import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.module';
import { EntitlementsService } from './entitlements.service';
import { CheckoutDto, CreateSubscriptionDto } from './dto/subscription.dto';
import {
  isPaystackLiveAllowed,
  isPaystackLiveSecret,
  paymentCurrency,
} from '../payments/payment-env';
import { PaystackService } from '../payments/paystack.service';
import {
  type BillingInterval,
  type PaidPlan,
  isPaidPlan,
  planChargeAmount,
  prepaidPeriod,
} from '../payments/pricing';
import { CATALOG_FALLBACK_ROWS } from '../plans/plans.service';
import { appOriginFromEnv, safeReturnUrl } from '../../common/utils/url.utils';
import { lockUserScope } from '../../common/utils/user-lock';

/** Applying a payment holds the user's billing lock: two payments never compute one period. */
const PAYMENT_LOCK_TX_OPTIONS = { maxWait: 15_000, timeout: 30_000 } as const;

type Db = Prisma.TransactionClient;

/** A verified Paystack payment for a plan (see PaymentsService). */
export type PrepaidPayment = {
  userId: string;
  plan: PaidPlan;
  interval: BillingInterval;
  reference: string;
  /** Subunit (× 100). */
  amount: number;
  currency: string;
  paidAt: Date;
  customerCode?: string | null;
  channel?: string | null;
};

@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly entitlements: EntitlementsService,
    private readonly paystack: PaystackService
  ) {}

  async me(userId: string) {
    const sub = await this.prisma.subscription.findUnique({
      where: { userId },
      include: { plan: true },
    });
    const snap = await this.entitlements.snapshot(userId);
    const trial = await this.prisma.user.findFirst({
      where: { id: userId },
      select: { trialEndsAt: true },
    });
    return {
      subscription: sub,
      tier: snap.tier,
      // Plans are prepaid (no card on file to bill after a trial): no trial is offered.
      trialEligible: false,
      trialEndsAt: trial?.trialEndsAt ?? null,
      entitlements: snap.entitlements,
      cvCount: snap.cvCount,
      cvLimit: snap.cvLimit,
      cvRemaining: snap.cvRemaining,
    };
  }

  /**
   * Internal only. Paid entitlements are granted via applyPrepaidPayment after a payment
   * verified with Paystack.
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

  /**
   * Prepaid plans never bill again by themselves, so there is nothing to stop at Paystack:
   * this only records that the user does not intend to renew (access runs to the period end).
   */
  async cancel(userId: string) {
    const sub = await this.prisma.subscription.findUnique({ where: { userId } });
    if (!sub) throw new NotFoundException({ code: 'NOT_FOUND', message: 'No subscription' });

    return this.prisma.subscription.update({
      where: { userId },
      data: {
        cancelAtPeriodEnd: true,
        canceledAt: new Date(),
      },
    });
  }

  /** Immediate end of paid access for account erasure (GDPR). Nothing bills again at Paystack. */
  async cancelImmediately(userId: string): Promise<{ hadSubscription: boolean }> {
    const sub = await this.prisma.subscription.findUnique({ where: { userId } });

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

    return { hadSubscription: Boolean(sub) };
  }

  /**
   * Opens a Paystack payment page for one prepaid period (a month or a year) of a plan.
   * Paying again before the end extends the period; paying for another plan switches to it
   * now and credits the unused time (see prepaidPeriod).
   */
  async checkout(userId: string, dto: CheckoutDto) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
    });
    if (!user) throw new NotFoundException({ code: 'NOT_FOUND', message: 'User not found' });

    const planRow = await this.prisma.plan.findUnique({
      where: { name: this.planName(dto.plan) },
    });
    if (!planRow) {
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

    if (isPaystackLiveSecret(process.env.PAYSTACK_SECRET_KEY) && !isPaystackLiveAllowed()) {
      throw new BadRequestException({
        code: 'PAYSTACK_LIVE_KEY_BLOCKED',
        message:
          'Live Paystack keys are blocked. Use sk_test_ keys, or set PAYSTACK_ALLOW_LIVE=1 for production go-live.',
      });
    }
    const paystack = this.paystack.require();

    const currency = paymentCurrency();
    const amount = planChargeAmount(dto.plan, dto.interval, {
      monthly: Number(planRow.priceMonthly),
      yearly: Number(planRow.priceYearly),
    });
    if (!amount) {
      this.logger.error(
        `No ${currency} price for ${dto.plan}/${dto.interval}: set PAYSTACK_PRICE_${dto.plan.toUpperCase()}_*`
      );
      throw new ServiceUnavailableException({
        code: 'PRICE_NOT_CONFIGURED',
        message: 'Prices are not configured. Contact support.',
      });
    }

    const reference = `sub_${randomUUID().replace(/-/g, '')}`;
    let session: { authorization_url: string };
    try {
      session = await paystack.initializeTransaction({
        email: user.email,
        amount,
        currency,
        reference,
        callback_url: successUrl,
        metadata: {
          type: 'subscription',
          userId,
          plan: dto.plan,
          interval: dto.interval,
          // What was asked, so the payment is checked against it rather than today's price.
          amount,
          currency,
          // Paystack's checkout shows a cancel link to this URL.
          cancel_action: cancelUrl,
        },
      });
    } catch (error) {
      this.logger.error(
        `Paystack checkout failed for user ${userId}`,
        error instanceof Error ? error.stack : error
      );
      throw new ServiceUnavailableException({
        code: 'PAYMENT_PROVIDER_UNAVAILABLE',
        message: 'Checkout is temporarily unavailable. Please try again later.',
      });
    }

    return {
      url: session.authorization_url,
      reference,
      plan: dto.plan,
      interval: dto.interval,
      userId,
      amount,
      currency,
    };
  }

  /**
   * Grants the period a verified payment bought. Idempotent on the Paystack reference (the
   * webhook and the success page can both deliver it), and serialized per user so two payments
   * never extend from the same end date.
   */
  async applyPrepaidPayment(
    payment: PrepaidPayment
  ): Promise<{ outcome: 'applied' | 'already_applied'; periodEnd: Date | null }> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        await lockUserScope(tx, payment.userId, 'billing:payment');

        const recorded = await tx.payment.findUnique({
          where: { transactionId: payment.reference },
          select: { id: true },
        });
        if (recorded) return { outcome: 'already_applied' as const, periodEnd: null };

        const user = await tx.user.findFirst({
          where: { id: payment.userId },
          select: { id: true },
        });
        if (!user) throw new Error(`Payment ${payment.reference} for unknown user`);

        const existing = await tx.subscription.findUnique({
          where: { userId: payment.userId },
          include: { plan: { select: { name: true } } },
        });
        const currentPlan = existing?.plan.name.toLowerCase();
        const current =
          existing && existing.status === 'active' && isPaidPlan(currentPlan)
            ? {
                plan: currentPlan,
                start: existing.currentPeriodStart,
                end: existing.currentPeriodEnd,
              }
            : null;
        const monthly = await this.monthlyPrices(tx);
        const period = prepaidPeriod({
          now: payment.paidAt,
          plan: payment.plan,
          interval: payment.interval,
          current,
          monthlyPrice: (plan) => monthly[plan],
        });

        const subscription = await this.applyPaidEntitlement(
          {
            userId: payment.userId,
            plan: payment.plan,
            provider: 'paystack',
            status: 'active',
            periodStart: period.start,
            periodEnd: period.end,
            paystackCustomerCode: payment.customerCode ?? undefined,
          },
          tx
        );

        const amount = payment.amount / 100;
        await tx.payment.create({
          data: {
            subscriptionId: subscription.id,
            amount,
            currency: payment.currency.toUpperCase(),
            status: 'completed',
            paymentMethod: 'paystack',
            transactionId: payment.reference,
            metadata: {
              plan: payment.plan,
              interval: payment.interval,
              channel: payment.channel ?? null,
              periodEnd: period.end.toISOString(),
            },
          },
        });
        await tx.invoice.create({
          data: {
            subscriptionId: subscription.id,
            invoiceNumber: `PSK-${payment.reference}`.slice(0, 64),
            amount,
            currency: payment.currency.toUpperCase(),
            status: 'paid',
            dueDate: payment.paidAt,
            paidAt: payment.paidAt,
          },
        });

        this.logger.log(
          `Prepaid ${payment.plan}/${payment.interval} applied for user ${payment.userId} ` +
            `until ${period.end.toISOString()} (ref ${payment.reference})`
        );
        return { outcome: 'applied' as const, periodEnd: period.end };
      }, PAYMENT_LOCK_TX_OPTIONS);
    } catch (error) {
      // Applied concurrently by another delivery of the same payment.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        return { outcome: 'already_applied', periodEnd: null };
      }
      throw error;
    }
  }

  async applyPaidEntitlement(
    params: {
      userId: string;
      plan: string;
      provider: 'paystack';
      status?: string;
      periodEnd: Date;
      periodStart: Date;
      paystackCustomerCode?: string;
      cancelAtPeriodEnd?: boolean;
      canceledAt?: Date | null;
    },
    db: Db | PrismaService = this.prisma
  ) {
    // Local statuses only (access rules: see resolveEffectiveTier); anything unknown fails
    // closed instead of defaulting to `active`.
    const statusMap: Record<string, 'active' | 'canceled' | 'past_due' | 'trialing' | 'suspended'> =
      {
        active: 'active',
        trialing: 'trialing',
        past_due: 'past_due',
        canceled: 'canceled',
        suspended: 'suspended',
      };

    const mappedStatus = statusMap[params.status ?? 'active'] ?? 'suspended';
    const isCanceled = mappedStatus === 'canceled';
    const grantsAccess = !isCanceled && mappedStatus !== 'suspended';
    const cancelAtPeriodEnd = Boolean(params.cancelAtPeriodEnd) && !isCanceled;
    const periodStart = params.periodStart;
    const canceledAt = isCanceled || cancelAtPeriodEnd ? (params.canceledAt ?? new Date()) : null;
    const tier =
      !grantsAccess || params.plan.toLowerCase() === 'free'
        ? 'free'
        : params.plan.toLowerCase() === 'business'
          ? 'business'
          : params.plan.toLowerCase() === 'pro'
            ? 'pro'
            : null;

    if (!tier) {
      throw new Error(`Unknown plan for ${params.provider} sync: ${params.plan}.`);
    }

    const planName = tier === 'free' ? 'Free' : this.planName(tier);
    const plan = await db.plan.findUnique({ where: { name: planName } });
    if (!plan) {
      throw new Error(
        `Unknown plan for ${params.provider} sync: ${planName}. Seed the plans table before processing payments.`
      );
    }

    const fields = {
      planId: plan.id,
      status: mappedStatus,
      provider: params.provider,
      currentPeriodStart: periodStart,
      currentPeriodEnd: params.periodEnd,
      lastPaymentError: null,
      cancelAtPeriodEnd,
      canceledAt,
      // A new period gets its own "ends soon" e-mail.
      renewalReminderSentAt: null,
      ...(params.paystackCustomerCode !== undefined
        ? { paystackCustomerCode: params.paystackCustomerCode }
        : {}),
    };

    const subscription = await db.subscription.upsert({
      where: { userId: params.userId },
      create: { userId: params.userId, ...fields },
      update: fields,
    });

    await db.user.update({
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

  /** Monthly catalog prices (EUR), used to credit unused time when the plan changes. */
  private async monthlyPrices(db: Db): Promise<Record<PaidPlan, number>> {
    const rows = await db.plan.findMany({
      where: { name: { in: ['Pro', 'Business'] } },
      select: { name: true, priceMonthly: true },
    });
    const price = (name: string) =>
      Number(
        rows.find((r) => r.name === name)?.priceMonthly ??
          CATALOG_FALLBACK_ROWS.find((r) => r.name === name)?.priceMonthly ??
          0
      );
    return { pro: price('Pro'), business: price('Business') };
  }

  private planName(plan: string) {
    return plan.charAt(0).toUpperCase() + plan.slice(1);
  }
}

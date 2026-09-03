import {
  Injectable,
  BadRequestException,
  Logger,
  NotFoundException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.module';
import { SubscriptionsService } from '../../subscriptions/subscriptions.service';
import { isNonPlaceholderSecret, isCinetpayFailClosed } from '../payment-env';
import { logPayment } from '../payment-log';
import { safeReturnUrl } from '../../../common/utils/url.utils';

const CINETPAY_API_URL = 'https://api-checkout.cinetpay.com';
const DEFAULT_USD_XOF_RATE = 656;
const FALLBACK_USD_PRICES = {
  pro: { month: 9.99, year: 99 },
  business: { month: 29.99, year: 299 },
} as const;

export type CinetpayPlan = 'pro' | 'business';
export type CinetpayInterval = 'month' | 'year';
export type CinetpayCheckStatus = 'ACCEPTED' | 'REFUSED' | 'WAITING';

type PaymentMetadata = {
  plan: CinetpayPlan;
  interval: CinetpayInterval;
  userId: string;
};

@Injectable()
export class CinetpayGateway {
  private readonly logger = new Logger(CinetpayGateway.name);
  private readonly apiUrl = CINETPAY_API_URL;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    @Inject(forwardRef(() => SubscriptionsService))
    private readonly subscriptions: SubscriptionsService
  ) {}

  /**
   * Create a CinetPay checkout URL.
   * Persists a pending Payment first, then calls POST /v2/payment.
   */
  async createPayment(
    userId: string,
    params: {
      plan: CinetpayPlan;
      interval: CinetpayInterval;
      subscriptionId: string;
      returnUrl?: string;
    }
  ) {
    const { apiKey, siteId } = this.requireCredentials();
    const appUrl = this.appBaseUrl();
    const apiUrl = this.apiBaseUrl();

    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
    });
    if (!user) throw new NotFoundException({ code: 'NOT_FOUND', message: 'User not found' });

    const subscription = await this.prisma.subscription.findUnique({
      where: { id: params.subscriptionId },
      include: { plan: true },
    });
    if (!subscription) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Subscription not found' });
    }

    const amountXof = this.amountXof(params.plan, params.interval, subscription.plan);
    const transactionId = `cv_${userId.replace(/-/g, '').slice(0, 8)}_${Date.now()}`;
    const returnUrl = this.safeCinetpayReturnUrl(params.returnUrl, appUrl, transactionId);
    const metadata: PaymentMetadata = {
      plan: params.plan,
      interval: params.interval,
      userId,
    };

    const payment = await this.prisma.payment.create({
      data: {
        subscriptionId: params.subscriptionId,
        paymentMethod: 'cinetpay',
        transactionId,
        status: 'pending',
        amount: amountXof,
        currency: 'XOF',
        metadata,
      },
    });

    this.logger.log(`Payment created: ${transactionId} for user ${userId}`);
    logPayment(this.logger, 'log', {
      message: 'Payment created',
      userId,
      transactionId,
      paymentMethod: 'cinetpay',
      amount: amountXof,
      currency: 'XOF',
      plan: params.plan,
      interval: params.interval,
    });

    try {
      const response = await fetch(`${this.apiUrl}/v2/payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apikey: apiKey,
          site_id: siteId,
          transaction_id: transactionId,
          amount: amountXof,
          currency: 'XOF',
          description: `CV Studio ${params.plan} ${params.interval}ly`,
          channels: 'ALL',
          lang: 'fr',
          customer_id: userId,
          customer_name: user.lastName || 'Customer',
          customer_surname: user.firstName || 'CVStudio',
          customer_email: user.email,
          customer_phone_number: this.phoneOrFallback(user.phone),
          customer_address: user.location || 'Abidjan',
          customer_city: 'Abidjan',
          customer_country: 'CI',
          customer_state: 'AB',
          customer_zip_code: '00225',
          notify_url: `${apiUrl}/api/v1/payments/webhook/cinetpay`,
          return_url: returnUrl,
        }),
      });

      const data = (await response.json().catch(() => ({}))) as {
        code?: string | number;
        message?: string;
        data?: { payment_url?: string };
      };

      if (!response.ok) {
        throw new Error(`CinetPay API error: ${response.status}`);
      }

      const code = String(data.code ?? '');
      if (!['201', '00'].includes(code) || !data.data?.payment_url) {
        this.logger.error(`CinetPay creation failed: ${data.message ?? code}`);
        throw new BadRequestException({
          code: 'CINETPAY_API_ERROR',
          message: data.message || 'Failed to create payment',
        });
      }

      this.logger.log(`Payment URL generated: ${transactionId}`);

      return {
        url: data.data.payment_url,
        transactionId,
        paymentMethod: 'cinetpay' as const,
        plan: params.plan,
        interval: params.interval,
      };
    } catch (error) {
      const message = this.errorMessage(error);
      this.logger.error(`CinetPay API error: ${message}`);
      const apiStatusMatch = /CinetPay API error: (\d+)/.exec(message);
      logPayment(this.logger, 'error', {
        message: 'CinetPay API error',
        error: message,
        transactionId,
        userId,
        ...(apiStatusMatch ? { apiStatus: Number(apiStatusMatch[1]) } : {}),
      });

      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'failed', failedReason: message },
      });

      if (error instanceof BadRequestException) throw error;

      throw new BadRequestException({
        code: 'CINETPAY_API_ERROR',
        message: 'Failed to create payment. Please try again.',
      });
    }
  }

  /**
   * Handle CinetPay notification.
   * GET = health ping. POST = verify via /v2/payment/check (never trust the body).
   * Always resolves (idempotent 200).
   */
  async handleCinetpayNotify(
    body: Record<string, string>,
    method: string
  ): Promise<{ received: true }> {
    if (method.toUpperCase() === 'GET') {
      this.logger.debug('CinetPay health check ping');
      return { received: true };
    }

    const transactionId = body.cpm_trans_id || body.transaction_id;
    if (!transactionId) {
      this.logger.warn('Received notify without transaction_id');
      return { received: true };
    }

    try {
      const checkStatus = await this.checkCinetpayStatus(transactionId);
      this.logger.log(`Payment ${transactionId} status: ${checkStatus.status}`);

      if (checkStatus.status === 'ACCEPTED') {
        await this.completeAcceptedPayment(transactionId);
      } else if (checkStatus.status === 'REFUSED') {
        await this.prisma.payment.updateMany({
          where: { transactionId, status: 'pending' },
          data: {
            status: 'failed',
            failedReason: body.cpm_error_message || 'Payment refused by customer',
          },
        });
        this.logger.warn(`Payment ${transactionId} REFUSED`);
      }
    } catch (error) {
      this.logger.error(`Error processing notify ${transactionId}: ${this.errorMessage(error)}`);
    }

    return { received: true };
  }

  async getPaymentStatus(transactionId: string, userId?: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { transactionId },
      include: { subscription: true },
    });

    if (!payment) {
      return { status: 'not_found' as const };
    }
    if (userId && payment.subscription.userId !== userId) {
      return { status: 'not_found' as const };
    }

    return {
      status: payment.status,
      paymentMethod: 'cinetpay' as const,
      transactionId,
    };
  }

  /**
   * Mandatory server-to-server verification. Never skip this on notify.
   * One retry on network/timeout/5xx, 5s abort per attempt.
   */
  async checkCinetpayStatus(transactionId: string): Promise<{ status: CinetpayCheckStatus }> {
    try {
      return await this.requestCheckStatus(transactionId);
    } catch (error) {
      this.logger.warn(`CinetPay check retry after: ${this.errorMessage(error)}`);
      return await this.requestCheckStatus(transactionId);
    }
  }

  private async requestCheckStatus(
    transactionId: string
  ): Promise<{ status: CinetpayCheckStatus }> {
    const { apiKey, siteId } = this.requireCredentials();

    const response = await fetch(`${this.apiUrl}/v2/payment/check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        apikey: apiKey,
        site_id: siteId,
        transaction_id: transactionId,
      }),
      signal: AbortSignal.timeout(5_000),
    });

    if (!response.ok) {
      throw new Error(`CinetPay check error: ${response.status}`);
    }

    const data = (await response.json()) as {
      data?: { status?: string };
    };
    const status = String(data.data?.status ?? 'WAITING').toUpperCase();

    if (status === 'ACCEPTED' || status === 'REFUSED') {
      return { status };
    }
    return { status: 'WAITING' };
  }

  private async completeAcceptedPayment(transactionId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { transactionId },
      include: { subscription: { include: { plan: true } } },
    });

    if (!payment) {
      throw new Error(`Payment not found: ${transactionId}`);
    }

    if (payment.status === 'completed') {
      this.logger.log(`Payment ${transactionId} already completed — skip grant`);
      return;
    }

    await this.grantPeriod(payment);

    const claimed = await this.prisma.payment.updateMany({
      where: { id: payment.id, status: { in: ['pending', 'failed'] } },
      data: { status: 'completed', failedReason: null },
    });

    if (claimed.count === 0) {
      this.logger.log(`Payment ${transactionId} already marked complete by another notify`);
      return;
    }

    this.logger.log(`Payment ${transactionId} ACCEPTED - period granted`);
  }

  private async grantPeriod(
    payment: Prisma.PaymentGetPayload<{ include: { subscription: { include: { plan: true } } } }>
  ) {
    const meta = this.readMetadata(payment.metadata);
    const interval: CinetpayInterval = meta?.interval ?? 'month';
    const planName = (meta?.plan ?? payment.subscription.plan.name).toLowerCase();
    const tier: CinetpayPlan = planName.includes('business') ? 'business' : 'pro';
    const userId = meta?.userId ?? payment.subscription.userId;

    const now = new Date();
    const periodStart =
      payment.subscription.currentPeriodEnd > now ? payment.subscription.currentPeriodEnd : now;
    const currentPeriodEnd = new Date(periodStart);
    if (interval === 'year') {
      currentPeriodEnd.setFullYear(currentPeriodEnd.getFullYear() + 1);
    } else {
      currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1);
    }

    await this.subscriptions.applyPaidEntitlement({
      userId,
      plan: tier,
      provider: 'cinetpay',
      status: 'active',
      periodStart,
      periodEnd: currentPeriodEnd,
      cinetpayTransactionId: payment.transactionId ?? undefined,
    });

    this.logger.log(`Period granted for user ${userId}, ends ${currentPeriodEnd.toISOString()}`);
  }

  isAvailable() {
    const apiKey = this.config.get<string>('CINETPAY_API_KEY');
    const siteId = this.config.get<string>('CINETPAY_SITE_ID');
    return isNonPlaceholderSecret(apiKey) && isNonPlaceholderSecret(siteId);
  }

  private requireCredentials() {
    const apiKey = this.config.get<string>('CINETPAY_API_KEY');
    const siteId = this.config.get<string>('CINETPAY_SITE_ID');
    if (!isNonPlaceholderSecret(apiKey) || !isNonPlaceholderSecret(siteId)) {
      const failClosed = isCinetpayFailClosed();
      throw new BadRequestException({
        code: 'CINETPAY_NOT_CONFIGURED',
        message: failClosed
          ? 'CinetPay is not available in this environment'
          : 'CinetPay is not configured in this environment',
      });
    }
    return { apiKey: apiKey.trim(), siteId: siteId.trim() };
  }

  private amountXof(
    plan: CinetpayPlan,
    interval: CinetpayInterval,
    dbPlan?: {
      priceMonthly: Prisma.Decimal | number | string;
      priceYearly: Prisma.Decimal | number | string;
    }
  ) {
    const rate = Number(this.config.get('CINETPAY_USD_XOF_RATE') ?? DEFAULT_USD_XOF_RATE);
    const usdFromDb =
      interval === 'year' ? Number(dbPlan?.priceYearly) : Number(dbPlan?.priceMonthly);
    const usd =
      Number.isFinite(usdFromDb) && usdFromDb > 0 ? usdFromDb : FALLBACK_USD_PRICES[plan][interval];
    return Math.max(1, Math.round(usd * rate));
  }

  private appBaseUrl() {
    return (
      this.config.get<string>('APP_URL') ??
      this.config.get<string>('NEXT_PUBLIC_APP_URL') ??
      'http://localhost:3000'
    ).replace(/\/$/, '');
  }

  /**
   * CinetPay must return to billing pending+tx so the UI can poll.
   * Client-provided URLs are allowlisted, then checkout/provider/tx are forced.
   */
  private safeCinetpayReturnUrl(
    input: string | undefined,
    appUrl: string,
    transactionId: string
  ): string {
    const fallback = `${appUrl}/account/billing?checkout=pending&provider=cinetpay&tx=${encodeURIComponent(transactionId)}`;
    const safe = safeReturnUrl(input, fallback, appUrl);
    const url = new URL(safe);
    url.searchParams.set('checkout', 'pending');
    url.searchParams.set('provider', 'cinetpay');
    url.searchParams.set('tx', transactionId);
    return url.toString();
  }

  private apiBaseUrl() {
    return (
      this.config.get<string>('API_URL') ?? `http://localhost:${process.env.PORT ?? 3001}`
    ).replace(/\/$/, '');
  }

  private phoneOrFallback(phone?: string | null) {
    const digits = (phone ?? '').replace(/\D/g, '');
    return digits.length >= 8 ? digits : '2250100000000';
  }

  private readMetadata(raw: Prisma.JsonValue | null): PaymentMetadata | null {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
    const obj = raw as Record<string, unknown>;
    const plan = obj.plan === 'business' ? 'business' : obj.plan === 'pro' ? 'pro' : null;
    const interval = obj.interval === 'year' ? 'year' : obj.interval === 'month' ? 'month' : null;
    const userId = typeof obj.userId === 'string' ? obj.userId : null;
    if (!plan || !interval || !userId) return null;
    return { plan, interval, userId };
  }

  private errorMessage(error: unknown) {
    if (error instanceof BadRequestException) {
      const res = error.getResponse();
      if (typeof res === 'object' && res && 'message' in res) {
        return String((res as { message: unknown }).message);
      }
      return error.message;
    }
    return error instanceof Error ? error.message : String(error);
  }
}

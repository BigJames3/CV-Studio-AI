import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  ServiceUnavailableException,
  Inject,
  Optional,
  forwardRef,
} from '@nestjs/common';
import { createHash } from 'crypto';
import { PrismaService } from '../../database/prisma.module';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { PaymentWebhookStoreService } from './payment-webhook-store.service';
import { PaymentAlertService } from './payment-alert.service';
import { PaystackService } from './paystack.service';
import {
  PaystackApiError,
  type PaystackTransaction,
  isValidPaystackSignature,
  metadataString,
  transactionMetadata,
  transactionPaidAt,
} from './paystack.client';
import { isBillingInterval, isPaidPlan } from './pricing';
import { emitSecurityAlert } from '../../observability';
import { MarketplaceService } from '../marketplace/marketplace.service';

const MAX_RETRIES = 3;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** A Paystack webhook body: `{ event: 'charge.success', data: { … } }`. */
export type PaystackEvent = { event: string; data: Record<string, unknown> };

export type FulfillmentOutcome =
  'applied' | 'already_applied' | 'not_paid' | 'rejected' | 'ignored' | 'duplicate_payment';

/**
 * Paystack events carry no id. The key is the event name plus the id of what it is about
 * (transaction, refund, dispute), or a hash of the body when it names nothing.
 */
export function paystackEventKey(event: PaystackEvent): string {
  const data = event.data ?? {};
  const subject = data.id ?? data.reference;
  if (subject !== undefined && subject !== null && String(subject) !== '') {
    return `${event.event}:${String(subject)}`.slice(0, 255);
  }
  const digest = createHash('sha256').update(JSON.stringify(event)).digest('hex');
  return `${event.event}:sha256:${digest}`.slice(0, 255);
}

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => SubscriptionsService))
    private readonly subscriptions: SubscriptionsService,
    private readonly webhookStore: PaymentWebhookStoreService,
    private readonly alerts: PaymentAlertService,
    private readonly paystack: PaystackService,
    @Optional()
    @Inject(forwardRef(() => MarketplaceService))
    private readonly marketplace?: MarketplaceService
  ) {}

  async history(userId: string) {
    const sub = await this.prisma.subscription.findUnique({ where: { userId } });
    if (!sub) return { items: [] };
    const items = await this.prisma.payment.findMany({
      where: { subscriptionId: sub.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return { items };
  }

  /**
   * The billing page (or the marketplace page, or the mobile app) calls this when Paystack
   * redirects back. The redirect alone proves nothing: the transaction is read from Paystack
   * and fulfilled exactly like the charge.success webhook, so access does not wait for the
   * webhook. Idempotent with it.
   */
  async confirmCheckout(userId: string, reference: string): Promise<{ confirmed: boolean }> {
    const notFound = new NotFoundException({
      code: 'CHECKOUT_NOT_FOUND',
      message: 'Payment not found',
    });

    let tx: PaystackTransaction;
    try {
      tx = await this.paystack.require().verifyTransaction(reference);
    } catch (error) {
      if (error instanceof PaystackApiError && error.status === 404) throw notFound;
      if (error instanceof ServiceUnavailableException) throw error;
      this.logger.warn(`Checkout confirm failed for ${reference}: ${(error as Error).message}`);
      throw new ServiceUnavailableException({
        code: 'PAYMENT_PROVIDER_UNAVAILABLE',
        message: 'Paystack is unavailable, the payment will be confirmed by webhook.',
      });
    }

    const metadata = transactionMetadata(tx);
    const owner =
      metadata.type === 'marketplace'
        ? metadataString(metadata, 'buyerId')
        : metadataString(metadata, 'userId');
    if (owner !== userId || tx.reference !== reference) throw notFound;
    if (tx.status !== 'success') return { confirmed: false };

    const outcome = await this.fulfillTransaction(tx);
    return { confirmed: outcome === 'applied' || outcome === 'already_applied' };
  }

  async handlePaystackWebhook(rawBody: Buffer, signature: string) {
    const secret = this.paystack.secretKey;
    if (!secret) {
      this.alerts.captureException(
        new Error('Paystack webhook received but Paystack is not configured'),
        { level: 'fatal', extra: { failClosed: true } }
      );
      throw new ServiceUnavailableException({
        code: 'PAYMENTS_NOT_CONFIGURED',
        message: 'Payment webhooks are not configured (fail-closed)',
      });
    }

    if (!isValidPaystackSignature(rawBody, signature, secret)) {
      this.logger.error('Paystack webhook signature verification failed');
      emitSecurityAlert({
        id: 'SEC-05',
        severity: 'P2',
        message: 'Paystack webhook signature verification failed',
      });
      throw new BadRequestException({
        code: 'INVALID_WEBHOOK',
        message: 'Invalid Paystack signature',
      });
    }

    let event: PaystackEvent;
    try {
      event = JSON.parse(rawBody.toString('utf8')) as PaystackEvent;
    } catch {
      throw new BadRequestException({ code: 'INVALID_WEBHOOK', message: 'Invalid JSON body' });
    }
    if (!event || typeof event.event !== 'string' || typeof event.data !== 'object') {
      throw new BadRequestException({ code: 'INVALID_WEBHOOK', message: 'Invalid event' });
    }

    await this.processEventWithRetry(event);
    return { received: true };
  }

  /**
   * Idempotent webhook processing with a Redis NX lock (multi-pod), then
   * DB unique event key, exponential backoff (3 attempts), then DLQ + Sentry.
   */
  async processEventWithRetry(event: PaystackEvent): Promise<void> {
    const idempotencyKey = paystackEventKey(event);

    if (await this.webhookStore.isProcessed(idempotencyKey)) {
      this.logger.log(`Webhook ${idempotencyKey} already processed`);
      return;
    }

    const locked = await this.webhookStore.acquireProcessingLock(idempotencyKey);
    if (!locked) {
      this.logger.warn(`Webhook ${idempotencyKey} skipped — already processing on another pod`);
      return;
    }

    try {
      if (await this.webhookStore.isProcessed(idempotencyKey)) {
        this.logger.log(`Webhook ${idempotencyKey} already processed (after lock)`);
        return;
      }

      const claimed = await this.webhookStore.markProcessing(idempotencyKey, event.event, event);
      if (!claimed) {
        this.logger.log(`Webhook ${idempotencyKey} not claimed (processed or DLQ)`);
        return;
      }

      let lastError: Error | null = null;

      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
          await this.dispatchEvent(event);
          await this.webhookStore.markProcessed(idempotencyKey);
          return;
        } catch (err) {
          lastError = err instanceof Error ? err : new Error(String(err));
          await this.webhookStore.incrementAttempts(idempotencyKey, lastError.message);

          if (attempt < MAX_RETRIES) {
            const delay = Math.pow(2, attempt) * 1000;
            this.logger.warn(
              `Webhook ${idempotencyKey} attempt ${attempt} failed, retry in ${delay}ms: ${lastError.message}`
            );
            await sleep(delay);
          }
        }
      }

      this.logger.error(
        `Webhook ${idempotencyKey} failed after ${MAX_RETRIES} retries: ${lastError?.message}`
      );

      await this.webhookStore.pushDlq({
        eventId: idempotencyKey,
        eventType: event.event,
        data: event,
        error: lastError?.message,
        timestamp: new Date(),
        attempts: MAX_RETRIES,
      });

      this.alerts.captureException(lastError, {
        eventId: idempotencyKey,
        eventType: event.event,
        retries: MAX_RETRIES,
        level: 'fatal',
      });

      throw lastError ?? new Error('Webhook processing failed');
    } finally {
      await this.webhookStore.releaseProcessingLock(idempotencyKey);
    }
  }

  /** Replay a single DLQ event (used by CronJob / webhook:retry-dlq). */
  async retryDlqEvent(eventId: string): Promise<{ ok: boolean; error?: string }> {
    const rows = await this.webhookStore.listDlq(200);
    const row = rows.find((r) => r.id === eventId);
    if (!row) return { ok: false, error: 'not_found' };

    const stored = row.payload as Partial<PaystackEvent> | null;
    const event: PaystackEvent = { event: row.type, data: stored?.data ?? {} };

    try {
      await this.webhookStore.reclaimFromDlq(eventId);
      await this.dispatchEvent(event);
      await this.webhookStore.markProcessed(eventId);
      return { ok: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await this.webhookStore.pushDlq({
        eventId,
        eventType: row.type,
        data: row.payload,
        error: message,
        timestamp: new Date(),
        attempts: row.attempts + 1,
      });
      this.alerts.captureException(err, {
        eventId,
        eventType: row.type,
        level: 'fatal',
        extra: { source: 'dlq-retry' },
      });
      return { ok: false, error: message };
    }
  }

  async retryAllDlq(limit = 50): Promise<{ retried: number; succeeded: number; failed: number }> {
    const rows = await this.webhookStore.listDlq(limit);
    let succeeded = 0;
    let failed = 0;
    for (const row of rows) {
      const result = await this.retryDlqEvent(row.id);
      if (result.ok) succeeded++;
      else failed++;
    }
    return { retried: rows.length, succeeded, failed };
  }

  private async dispatchEvent(event: PaystackEvent): Promise<void> {
    switch (event.event) {
      case 'charge.success': {
        const reference = event.data.reference;
        if (typeof reference !== 'string' || !reference) {
          throw new Error('charge.success without reference');
        }
        // The payload is only a hint: the transaction is read from Paystack.
        const tx = await this.paystack.require().verifyTransaction(reference);
        const outcome = await this.fulfillTransaction(tx);
        this.logger.log(`charge.success ${reference}: ${outcome}`);
        break;
      }
      case 'refund.processed': {
        // Marketplace licences only; a plan refund is handled by support.
        await this.marketplace?.onRefundProcessed(event.data);
        break;
      }
      case 'charge.dispute.create':
      case 'charge.dispute.remind':
      case 'charge.dispute.resolve': {
        await this.marketplace?.onChargeDispute(event.data, event.event);
        break;
      }
      default:
        this.logger.debug(`Unhandled Paystack event: ${event.event}`);
    }
  }

  /** Grants what a verified, successful transaction paid for. */
  async fulfillTransaction(tx: PaystackTransaction): Promise<FulfillmentOutcome> {
    if (tx.status !== 'success') return 'not_paid';
    const metadata = transactionMetadata(tx);

    if (metadata.type === 'marketplace') {
      if (!this.marketplace) {
        throw new Error(`Marketplace fulfillment not wired (reference=${tx.reference})`);
      }
      const result = await this.marketplace.fulfillTransaction(tx);
      return result.outcome === 'fulfilled'
        ? 'applied'
        : result.outcome === 'already_fulfilled'
          ? 'already_applied'
          : result.outcome;
    }

    if (metadata.type !== 'subscription') {
      // Not created by this app (payment page, another integration on the same account).
      this.logger.warn(`Ignoring Paystack transaction ${tx.reference}: no known type`);
      return 'ignored';
    }

    const userId = metadataString(metadata, 'userId');
    const plan = metadata.plan;
    const interval = metadata.interval;
    const expectedAmount = Number(metadata.amount);
    const expectedCurrency = metadataString(metadata, 'currency')?.toUpperCase();
    if (!userId || !isPaidPlan(plan) || !isBillingInterval(interval)) {
      throw new Error(`Subscription payment ${tx.reference} has incomplete metadata`);
    }
    if (tx.amount !== expectedAmount || tx.currency.toUpperCase() !== expectedCurrency) {
      this.logger.error(
        `Subscription payment ${tx.reference}: paid ${tx.amount} ${tx.currency}, expected ${expectedAmount} ${expectedCurrency}`
      );
      emitSecurityAlert({
        id: 'PAY-01',
        severity: 'P1',
        message: 'Subscription payment amount does not match the checkout: nothing granted',
        extra: { reference: tx.reference, amount: tx.amount, currency: tx.currency },
      });
      return 'rejected';
    }

    const result = await this.subscriptions.applyPrepaidPayment({
      userId,
      plan,
      interval,
      reference: tx.reference,
      amount: tx.amount,
      currency: tx.currency,
      paidAt: transactionPaidAt(tx),
      customerCode: tx.customer?.customer_code ?? null,
      channel: tx.channel ?? null,
    });
    return result.outcome;
  }
}

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
import Stripe from 'stripe';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.module';
import { LIVE_STRIPE_STATUSES, SubscriptionsService } from '../subscriptions/subscriptions.service';
import { MailService } from '../../mail/mail.service';
import { StripeWebhookStoreService } from './stripe-webhook-store.service';
import { StripeAlertService } from './stripe-alert.service';
import {
  expandableStripeId,
  isNonPlaceholderSecret,
  stripeSecretForClient,
  stripeWebhookSecrets,
} from './payment-env';
import { emitSecurityAlert } from '../../observability';
import { MarketplaceService } from '../marketplace/marketplace.service';

const MAX_RETRIES = 3;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private stripe: Stripe | null = null;

  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => SubscriptionsService))
    private readonly subscriptions: SubscriptionsService,
    private readonly mail: MailService,
    private readonly webhookStore: StripeWebhookStoreService,
    private readonly alerts: StripeAlertService,
    @Optional()
    @Inject(forwardRef(() => MarketplaceService))
    private readonly marketplace?: MarketplaceService
  ) {
    const key = stripeSecretForClient();
    if (key) {
      this.stripe = new Stripe(key, { apiVersion: '2025-02-24.acacia' });
    }
  }

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
   * The billing page calls this when Stripe redirects back from Checkout. The session is read
   * from Stripe (the redirect alone proves nothing) and fulfilled exactly like
   * checkout.session.completed, so the plan is active even when the webhook is late or was not
   * delivered. Idempotent with the webhook.
   */
  async confirmCheckoutSession(userId: string, sessionId: string): Promise<{ confirmed: boolean }> {
    if (!this.stripe) {
      throw new BadRequestException({
        code: 'STRIPE_NOT_CONFIGURED',
        message: 'Stripe is not configured (fail-closed).',
      });
    }

    const notFound = new NotFoundException({
      code: 'CHECKOUT_SESSION_NOT_FOUND',
      message: 'Checkout session not found',
    });
    let session: Stripe.Checkout.Session;
    try {
      session = await this.stripe.checkout.sessions.retrieve(sessionId, { expand: ['invoice'] });
    } catch (error) {
      if ((error as { code?: string } | null)?.code === 'resource_missing') throw notFound;
      this.logger.warn(`Checkout confirm failed for ${sessionId}: ${(error as Error).message}`);
      throw new ServiceUnavailableException({
        code: 'STRIPE_UNAVAILABLE',
        message: 'Stripe is unavailable, the payment will be confirmed by webhook.',
      });
    }

    const owner = session.client_reference_id ?? session.metadata?.userId;
    if (owner !== userId || session.mode !== 'subscription') throw notFound;
    if (session.status !== 'complete') return { confirmed: false };

    try {
      await this.onCheckoutCompleted(session);
      const invoice = session.invoice;
      if (invoice && typeof invoice !== 'string' && invoice.status === 'paid') {
        await this.onInvoicePaid(invoice);
      }
    } catch (error) {
      // The webhook created the same row at the same moment: it is confirmed either way.
      if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002')) {
        throw error;
      }
    }
    return { confirmed: true };
  }

  async handleStripeWebhook(rawBody: Buffer, signature: string) {
    if (!this.stripe || !isNonPlaceholderSecret(process.env.STRIPE_WEBHOOK_SECRET)) {
      this.alerts.captureException(
        new Error('Stripe webhook received but Stripe is not configured'),
        {
          level: 'fatal',
          extra: { failClosed: true },
        }
      );
      throw new ServiceUnavailableException({
        code: 'STRIPE_NOT_CONFIGURED',
        message: 'Stripe webhooks are not configured (fail-closed)',
      });
    }

    // One endpoint for account events, an optional second one for Connect events: accept either.
    let event: Stripe.Event | undefined;
    let err: unknown;
    for (const secret of stripeWebhookSecrets()) {
      try {
        event = this.stripe.webhooks.constructEvent(rawBody, signature, secret);
        break;
      } catch (e) {
        err = e;
      }
    }
    if (!event) {
      this.logger.error(`Webhook signature verification failed: ${(err as Error).message}`);
      emitSecurityAlert({
        id: 'SEC-05',
        severity: 'P2',
        message: 'Stripe webhook signature verification failed',
        extra: { error: (err as Error).message },
      });
      throw new BadRequestException({
        code: 'INVALID_WEBHOOK',
        message: 'Invalid Stripe signature',
      });
    }

    await this.processEventWithRetry(event);
    return { received: true };
  }

  /**
   * Idempotent webhook processing with a Redis NX lock (multi-pod), then
   * DB unique event.id, exponential backoff (3 attempts), then DLQ + Sentry.
   */
  async processEventWithRetry(event: Stripe.Event): Promise<void> {
    const idempotencyKey = event.id;

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

      const claimed = await this.webhookStore.markProcessing(
        idempotencyKey,
        event.type,
        event.data
      );
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
        eventId: event.id,
        eventType: event.type,
        data: event.data,
        error: lastError?.message,
        timestamp: new Date(),
        attempts: MAX_RETRIES,
      });

      this.alerts.captureException(lastError, {
        eventId: event.id,
        eventType: event.type,
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

    const payload = row.payload as { object?: unknown } | null;
    const fakeEvent = {
      id: row.id,
      type: row.type,
      data: payload ?? { object: {} },
    } as Stripe.Event;

    try {
      await this.webhookStore.reclaimFromDlq(eventId);
      await this.dispatchEvent(fakeEvent);
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

  private async dispatchEvent(event: Stripe.Event): Promise<void> {
    switch (event.type) {
      case 'checkout.session.completed': {
        await this.onCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      }
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        await this.onSubscriptionChanged(event.data.object as Stripe.Subscription);
        break;
      }
      case 'invoice.paid':
      case 'invoice.payment_succeeded': {
        await this.onInvoicePaid(event.data.object as Stripe.Invoice);
        break;
      }
      case 'invoice.payment_failed': {
        await this.onInvoiceFailed(event.data.object as Stripe.Invoice);
        break;
      }
      case 'account.updated': {
        if (!this.marketplace) {
          this.logger.warn(
            `account.updated ignored — marketplace not wired (account=${(event.data.object as Stripe.Account).id})`
          );
          break;
        }
        await this.marketplace.syncConnectedAccountFromWebhook(event.data.object as Stripe.Account);
        break;
      }
      default:
        this.logger.debug(`Unhandled Stripe event: ${event.type}`);
    }
  }

  private async onCheckoutCompleted(session: Stripe.Checkout.Session) {
    if (session.metadata?.type === 'marketplace') {
      if (!this.marketplace) {
        throw new Error(`Marketplace fulfillment not wired (session=${session.id})`);
      }
      await this.marketplace.fulfillCheckoutSession(session);
      this.logger.log(`Marketplace licence fulfilled via checkout ${session.id}`);
      return;
    }

    const userId = session.client_reference_id ?? session.metadata?.userId;
    if (!userId || !session.subscription) {
      throw new Error(
        `checkout.session.completed missing userId or subscription (session=${session.id})`
      );
    }

    const stripeSubId =
      typeof session.subscription === 'string' ? session.subscription : session.subscription.id;
    const stripeSub = await this.stripe!.subscriptions.retrieve(stripeSubId);
    const plan = resolvePaidPlan(session, stripeSub);
    const stripeCustomerId =
      expandableStripeId(session.customer) ?? expandableStripeId(stripeSub.customer);

    await this.cancelSupersededSubscriptions(userId, stripeSub.id, stripeCustomerId);

    const period = subscriptionPeriod(stripeSub);
    await this.subscriptions.applyPaidEntitlement({
      userId,
      plan,
      provider: 'stripe',
      status: stripeSub.status,
      periodStart: period.start,
      periodEnd: period.end,
      stripeSubscriptionId: stripeSub.id,
      stripeCustomerId,
      cancelAtPeriodEnd: Boolean(stripeSub.cancel_at_period_end),
    });

    this.logger.log(
      `Subscription synced for user ${userId} via checkout ${session.id} plan=${plan}`
    );
  }

  private async onSubscriptionChanged(stripeSub: Stripe.Subscription) {
    let userId = stripeSub.metadata?.userId;
    if (!userId) {
      const local = await this.prisma.subscription.findFirst({
        where: { stripeSubscriptionId: stripeSub.id },
      });
      if (!local) {
        throw new Error(`Subscription not found for Stripe ID: ${stripeSub.id}`);
      }
      userId = local.userId;
    }

    const local = await this.prisma.subscription.findUnique({ where: { userId } });
    if (local?.stripeSubscriptionId && local.stripeSubscriptionId !== stripeSub.id) {
      // Events for a replaced subscription (e.g. its cancellation) must not overwrite the
      // user's current one. A new subscription is synced by checkout.session.completed.
      this.logger.warn(
        `Ignoring ${stripeSub.status} event for Stripe subscription ${stripeSub.id}: ` +
          `user ${userId} is on ${local.stripeSubscriptionId}`
      );
      return;
    }

    const isFullyCanceled = stripeSub.status === 'canceled' || stripeSub.status === 'unpaid';
    const cancelAtPeriodEnd = Boolean(stripeSub.cancel_at_period_end) && !isFullyCanceled;

    let planName: string;
    if (isFullyCanceled) {
      planName = 'free';
    } else {
      const resolved = tryResolvePaidPlanFromSubscription(stripeSub);
      if (resolved) {
        planName = resolved;
      } else {
        const user = await this.prisma.user.findFirst({
          where: { id: userId, deletedAt: null },
          select: { subscriptionTier: true },
        });
        if (!user || !isPaidPlan(user.subscriptionTier)) {
          throw new Error(
            `Unknown plan for subscription ${stripeSub.id}. ` +
              `Please ensure STRIPE_PRICE_PRO_* and STRIPE_PRICE_BUSINESS_* are configured correctly.`
          );
        }
        planName = user.subscriptionTier;
      }
    }

    const period = subscriptionPeriod(stripeSub);
    await this.subscriptions.applyPaidEntitlement({
      userId,
      plan: planName,
      provider: 'stripe',
      status: isFullyCanceled ? 'canceled' : stripeSub.status,
      periodStart: period.start,
      periodEnd: period.end,
      stripeSubscriptionId: stripeSub.id,
      stripeCustomerId: expandableStripeId(stripeSub.customer),
      cancelAtPeriodEnd,
    });

    this.logger.log(
      `Subscription ${stripeSub.id} status=${stripeSub.status} cancelAtPeriodEnd=${cancelAtPeriodEnd} for user ${userId}`
    );
  }

  /**
   * One live Stripe subscription per user: when a Checkout completes, every other live
   * subscription of the user is canceled with a prorated credit, so the customer is never billed
   * twice. Candidates come from the database (the subscription it knows) and from Stripe (every
   * subscription of the customer): Checkouts completed before the previous one was recorded
   * (webhook late or missed, several tabs) are only visible in Stripe.
   * Runs before the new subscription is recorded, so a retry still sees the previous ones.
   */
  private async cancelSupersededSubscriptions(
    userId: string,
    newStripeSubId: string,
    stripeCustomerId: string | null | undefined
  ) {
    const stripe = this.stripe!;
    const live = new Set<string>();

    const local = await this.prisma.subscription.findUnique({ where: { userId } });
    const recordedId = local?.stripeSubscriptionId;
    if (recordedId && recordedId !== newStripeSubId) {
      try {
        const recorded = await stripe.subscriptions.retrieve(recordedId);
        if (LIVE_STRIPE_STATUSES.has(recorded.status)) live.add(recorded.id);
      } catch (error) {
        if ((error as { code?: string } | null)?.code !== 'resource_missing') throw error;
      }
    }

    if (stripeCustomerId) {
      // A Stripe error throws: the event is retried rather than recorded next to a duplicate.
      const subs = await stripe.subscriptions.list({
        customer: stripeCustomerId,
        status: 'all',
        limit: 100,
      });
      for (const sub of subs.data) {
        if (sub.id !== newStripeSubId && LIVE_STRIPE_STATUSES.has(sub.status)) live.add(sub.id);
      }
    }

    for (const id of live) {
      await stripe.subscriptions.cancel(id, { prorate: true });
      this.logger.warn(
        `Canceled superseded Stripe subscription ${id} for user ${userId} ` +
          `(replaced by ${newStripeSubId})`
      );
    }
    const unrecorded = [...live].filter((id) => id !== recordedId);
    if (unrecorded.length > 0) {
      // A plan change replaces the recorded subscription; anything else is a duplicate that
      // got through (webhook missed, two tabs): worth a look.
      emitSecurityAlert({
        id: 'PAY-04',
        severity: 'P2',
        message: 'Duplicate Stripe subscriptions canceled',
        extra: { userId, kept: newStripeSubId, canceled: [...live] },
      });
    }
  }

  /**
   * Local subscription billed by an invoice. Stripe often sends invoice.* before
   * checkout.session.completed: when the row is missing, sync the subscription from Stripe first
   * (it carries userId in its metadata) instead of failing into the DLQ.
   */
  private async findInvoiceSubscription(invoice: Stripe.Invoice, eventType: string) {
    const stripeSubId = invoiceSubscriptionId(invoice);
    if (!stripeSubId) {
      throw new Error(`${eventType} missing subscription (invoice=${invoice.id})`);
    }

    const find = () =>
      this.prisma.subscription.findFirst({
        where: { stripeSubscriptionId: stripeSubId },
        include: { user: true },
      });

    let sub = await find();
    if (!sub && this.stripe) {
      const stripeSub = await this.stripe.subscriptions.retrieve(stripeSubId);
      if (stripeSub.metadata?.userId) {
        await this.onSubscriptionChanged(stripeSub);
        sub = await find();
      }
    }
    if (!sub) {
      throw new Error(`Subscription not found for Stripe ID: ${stripeSubId}`);
    }
    return sub;
  }

  private async onInvoicePaid(invoice: Stripe.Invoice) {
    const sub = await this.findInvoiceSubscription(invoice, 'invoice.paid');

    try {
      await this.prisma.payment.create({
        data: {
          subscriptionId: sub.id,
          amount: (invoice.amount_paid ?? 0) / 100,
          currency: (invoice.currency ?? 'usd').toUpperCase(),
          status: 'completed',
          paymentMethod: 'stripe',
          stripePaymentIntentId:
            typeof invoice.payment_intent === 'string'
              ? invoice.payment_intent
              : invoice.payment_intent?.id,
          transactionId: invoice.id,
        },
      });
    } catch (err) {
      // Idempotent: unique transactionId on replay
      if (!(err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002')) {
        throw err;
      }
    }

    const invoiceNumber = invoice.number ?? `INV-${invoice.id}`;
    await this.prisma.invoice.upsert({
      where: { invoiceNumber },
      create: {
        subscriptionId: sub.id,
        invoiceNumber,
        amount: (invoice.amount_paid ?? 0) / 100,
        currency: (invoice.currency ?? 'usd').toUpperCase(),
        status: 'paid',
        pdfUrl: invoice.invoice_pdf ?? undefined,
        dueDate: new Date((invoice.created ?? Date.now() / 1000) * 1000),
        paidAt: new Date(),
      },
      update: {
        status: 'paid',
        pdfUrl: invoice.invoice_pdf ?? undefined,
        paidAt: new Date(),
      },
    });

    this.logger.log(`Payment recorded for subscription ${sub.id} invoice=${invoice.id}`);
  }

  private async onInvoiceFailed(invoice: Stripe.Invoice) {
    const sub = await this.findInvoiceSubscription(invoice, 'invoice.payment_failed');

    await this.prisma.subscription.update({
      where: { id: sub.id },
      data: { status: 'past_due' },
    });

    try {
      await this.prisma.payment.create({
        data: {
          subscriptionId: sub.id,
          amount: (invoice.amount_due ?? invoice.total ?? 0) / 100,
          currency: (invoice.currency ?? 'usd').toUpperCase(),
          status: 'failed',
          paymentMethod: 'stripe',
          transactionId: `${invoice.id}:failed`,
          failedReason: invoice.last_finalization_error?.message ?? 'payment_failed',
        },
      });
    } catch (err) {
      if (!(err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002')) {
        throw err;
      }
    }

    const retryDate = invoice.next_payment_attempt
      ? new Date(invoice.next_payment_attempt * 1000)
      : null;

    await this.mail.sendPaymentFailed(sub.user.email, {
      amount: (invoice.amount_due ?? invoice.total ?? 0) / 100,
      currency: (invoice.currency ?? 'usd').toUpperCase(),
      retryDate,
    });

    this.alerts.captureException(new Error(`Payment failed for subscription ${sub.id}`), {
      eventType: 'invoice.payment_failed',
      level: 'error',
      extra: { subscriptionId: sub.id, invoiceId: invoice.id, userId: sub.userId },
    });

    this.logger.warn(`Payment failed for subscription ${sub.id}`);
  }
}

export type PaidPlan = 'pro' | 'business';

export function isPaidPlan(value: unknown): value is PaidPlan {
  return value === 'pro' || value === 'business';
}

export function mapStripePriceToPlan(priceId: string | undefined | null): PaidPlan | null {
  if (!priceId) return null;
  const mapping: Record<string, PaidPlan> = {};
  const add = (envKey: string, plan: PaidPlan) => {
    const id = process.env[envKey];
    if (isNonPlaceholderSecret(id)) mapping[id] = plan;
  };
  add('STRIPE_PRICE_PRO_MONTHLY', 'pro');
  add('STRIPE_PRICE_PRO_YEARLY', 'pro');
  add('STRIPE_PRICE_PRO_ANNUAL', 'pro');
  add('STRIPE_PRICE_BUSINESS_MONTHLY', 'business');
  add('STRIPE_PRICE_BUSINESS_YEARLY', 'business');
  add('STRIPE_PRICE_BUSINESS_ANNUAL', 'business');
  return mapping[priceId] ?? null;
}

export function tryResolvePaidPlanFromSubscription(
  stripeSub: Stripe.Subscription
): PaidPlan | null {
  // The billed price is the truth: metadata can be stale after an in-place plan change.
  const price = stripeSub.items?.data?.[0]?.price;
  const priceId = typeof price === 'string' ? price : price?.id;
  const fromPrice = mapStripePriceToPlan(priceId);
  if (fromPrice) return fromPrice;
  const fromMeta = stripeSub.metadata?.plan;
  return isPaidPlan(fromMeta) ? fromMeta : null;
}

export function resolvePaidPlan(
  session: Pick<Stripe.Checkout.Session, 'id' | 'metadata'>,
  stripeSub: Stripe.Subscription
): PaidPlan {
  const fromMeta = session.metadata?.plan ?? stripeSub.metadata?.plan;
  if (isPaidPlan(fromMeta)) return fromMeta;

  const price = stripeSub.items?.data?.[0]?.price;
  const priceId = typeof price === 'string' ? price : price?.id;
  const fromPrice = mapStripePriceToPlan(priceId);
  if (fromPrice) return fromPrice;

  throw new Error(
    `Unknown plan for price ${priceId ?? 'missing'} (session ${session.id}). ` +
      `Please ensure STRIPE_PRICE_PRO_* and STRIPE_PRICE_BUSINESS_* are configured correctly.`
  );
}

/*
 * Webhook payloads are rendered in the API version of the Stripe account (or of the endpoint),
 * not in the version pinned by this SDK. Since 2025-03-31.basil the billing period lives on the
 * subscription items and an invoice points to its subscription through `parent`. Read both.
 */

type VersionedSubscriptionItem = Stripe.SubscriptionItem & {
  current_period_start?: number;
  current_period_end?: number;
};

export function subscriptionPeriod(stripeSub: Stripe.Subscription): { start: Date; end: Date } {
  const item = stripeSub.items?.data?.[0] as VersionedSubscriptionItem | undefined;
  const start = stripeSub.current_period_start ?? item?.current_period_start;
  const end = stripeSub.current_period_end ?? item?.current_period_end;
  if (!start || !end) {
    throw new Error(`Stripe subscription ${stripeSub.id} has no billing period`);
  }
  return { start: new Date(start * 1000), end: new Date(end * 1000) };
}

export function invoiceSubscriptionId(invoice: Stripe.Invoice): string | undefined {
  const legacy = invoice.subscription;
  if (legacy) return typeof legacy === 'string' ? legacy : legacy.id;
  const parent = (
    invoice as {
      parent?: { subscription_details?: { subscription?: string | { id: string } | null } | null };
    }
  ).parent?.subscription_details?.subscription;
  if (!parent) return undefined;
  return typeof parent === 'string' ? parent : parent.id;
}

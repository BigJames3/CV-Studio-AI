import {
  Injectable,
  Logger,
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import Stripe from 'stripe';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.module';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { MailService } from '../../mail/mail.service';
import { EmailService } from '../email/email.service';
import { StripeWebhookStoreService } from './stripe-webhook-store.service';
import { StripeAlertService } from './stripe-alert.service';
import { AnalyticsEventsService } from '../analytics/analytics-events.service';

const MAX_RETRIES = 3;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isProduction() {
  return process.env.NODE_ENV === 'production' || process.env.STRIPE_FAIL_CLOSED === '1';
}

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private stripe: Stripe | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly subscriptions: SubscriptionsService,
    private readonly mail: MailService,
    private readonly emailService: EmailService,
    private readonly webhookStore: StripeWebhookStoreService,
    private readonly alerts: StripeAlertService,
    private readonly analyticsEvents: AnalyticsEventsService
  ) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (key && !key.includes('xxx')) {
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

  async handleStripeWebhook(rawBody: Buffer, signature: string) {
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!this.stripe || !secret || secret.includes('xxx')) {
      if (isProduction()) {
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
      this.logger.warn('Stripe webhook received but Stripe is not configured (dev soft-ack)');
      return { received: true, configured: false };
    }

    let event: Stripe.Event;
    try {
      event = this.stripe.webhooks.constructEvent(rawBody, signature, secret);
    } catch (err) {
      this.logger.error(`Webhook signature verification failed: ${(err as Error).message}`);
      throw new BadRequestException({
        code: 'INVALID_WEBHOOK',
        message: 'Invalid Stripe signature',
      });
    }

    await this.processEventWithRetry(event);
    return { received: true };
  }

  /**
   * Idempotent webhook processing with exponential backoff (3 attempts) then DLQ + Sentry.
   */
  async processEventWithRetry(event: Stripe.Event): Promise<void> {
    const idempotencyKey = event.id;

    if (await this.webhookStore.isProcessed(idempotencyKey)) {
      this.logger.log(`Webhook ${idempotencyKey} already processed`);
      return;
    }

    const claimed = await this.webhookStore.markProcessing(idempotencyKey, event.type, event.data);
    if (!claimed && (await this.webhookStore.isProcessed(idempotencyKey))) {
      this.logger.log(`Webhook ${idempotencyKey} already processed (race)`);
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
    this.analyticsEvents.trackStripeWebhookFailed(
      event.type,
      lastError?.message ?? 'Webhook processing failed'
    );

    throw lastError ?? new Error('Webhook processing failed');
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
      default:
        this.logger.debug(`Unhandled Stripe event: ${event.type}`);
    }
  }

  private async onCheckoutCompleted(session: Stripe.Checkout.Session) {
    const userId = session.client_reference_id ?? session.metadata?.userId;
    const plan = session.metadata?.plan ?? 'pro';
    if (!userId || !session.subscription) {
      throw new Error(
        `checkout.session.completed missing userId or subscription (session=${session.id})`
      );
    }

    const stripeSubId =
      typeof session.subscription === 'string' ? session.subscription : session.subscription.id;
    const stripeSub = await this.stripe!.subscriptions.retrieve(stripeSubId);
    const stripeCustomerId =
      typeof session.customer === 'string'
        ? session.customer
        : (session.customer?.id ??
          (typeof stripeSub.customer === 'string' ? stripeSub.customer : stripeSub.customer?.id));

    await this.subscriptions.applyStripeSubscription({
      userId,
      planName: plan,
      stripeSubscriptionId: stripeSub.id,
      status: stripeSub.status,
      currentPeriodStart: new Date(stripeSub.current_period_start * 1000),
      currentPeriodEnd: new Date(stripeSub.current_period_end * 1000),
      stripeCustomerId,
      cancelAtPeriodEnd: stripeSub.cancel_at_period_end,
    });

    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      select: { email: true, firstName: true, lastName: true },
    });
    if (user) {
      const upgradePlan = plan.toLowerCase() === 'business' ? 'business' : 'pro';
      const displayName =
        [user.firstName, user.lastName].filter(Boolean).join(' ').trim() || 'there';
      await this.emailService.sendUpgradeConfirmationEmail(
        user.email,
        displayName,
        upgradePlan,
        session.id,
        session.amount_total ?? 0,
        session.currency ?? 'usd',
        new Date(stripeSub.current_period_end * 1000)
      );
    }

    this.logger.log(`Subscription synced for user ${userId} via checkout ${session.id}`);
    this.analyticsEvents.trackUpgradeCompleted(
      userId,
      plan,
      session.amount_total != null ? session.amount_total / 100 : undefined
    );
  }

  private async onSubscriptionChanged(stripeSub: Stripe.Subscription) {
    let userId = stripeSub.metadata?.userId;
    let previousCancelAtPeriodEnd = false;

    const local = await this.prisma.subscription.findFirst({
      where: userId ? { userId } : { stripeSubscriptionId: stripeSub.id },
      include: { user: { select: { email: true, subscriptionTier: true } } },
    });

    if (!userId) {
      if (!local) {
        throw new Error(`Subscription not found for Stripe ID: ${stripeSub.id}`);
      }
      userId = local.userId;
    }

    previousCancelAtPeriodEnd = Boolean(local?.cancelAtPeriodEnd);

    const planName =
      stripeSub.status === 'canceled' || stripeSub.status === 'unpaid'
        ? (stripeSub.metadata?.plan ?? 'free')
        : (stripeSub.metadata?.plan ?? 'pro');

    await this.subscriptions.applyStripeSubscription({
      userId,
      planName: stripeSub.status === 'canceled' ? 'free' : planName,
      stripeSubscriptionId: stripeSub.id,
      status: stripeSub.status === 'canceled' ? 'canceled' : stripeSub.status,
      currentPeriodStart: new Date(stripeSub.current_period_start * 1000),
      currentPeriodEnd: new Date(stripeSub.current_period_end * 1000),
      stripeCustomerId:
        typeof stripeSub.customer === 'string' ? stripeSub.customer : stripeSub.customer?.id,
      cancelAtPeriodEnd: stripeSub.cancel_at_period_end,
    });

    if (stripeSub.cancel_at_period_end && !previousCancelAtPeriodEnd) {
      const email = local?.user?.email;
      if (email) {
        await this.mail.sendSubscriptionCancelScheduled(email, {
          plan: local?.user?.subscriptionTier ?? planName,
          accessUntil: new Date(stripeSub.current_period_end * 1000),
        });
      }
    }

    this.logger.log(`Subscription ${stripeSub.id} status=${stripeSub.status} for user ${userId}`);
    if (stripeSub.status === 'canceled') {
      this.analyticsEvents.trackSubscriptionCanceled(userId, planName);
    }
  }

  private async onInvoicePaid(invoice: Stripe.Invoice) {
    const stripeSubId =
      typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription?.id;
    if (!stripeSubId) {
      throw new Error(`invoice.paid missing subscription (invoice=${invoice.id})`);
    }

    const sub = await this.prisma.subscription.findFirst({
      where: { stripeSubscriptionId: stripeSubId },
    });
    if (!sub) {
      throw new Error(`Subscription not found for Stripe ID: ${stripeSubId}`);
    }

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
    this.analyticsEvents.trackPaymentCompleted(
      sub.userId,
      (invoice.amount_paid ?? 0) / 100,
      (invoice.currency ?? 'usd').toUpperCase()
    );
  }

  private async onInvoiceFailed(invoice: Stripe.Invoice) {
    const stripeSubId =
      typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription?.id;
    if (!stripeSubId) {
      throw new Error(`invoice.payment_failed missing subscription (invoice=${invoice.id})`);
    }

    const sub = await this.prisma.subscription.findFirst({
      where: { stripeSubscriptionId: stripeSubId },
      include: { user: true },
    });
    if (!sub) {
      throw new Error(`Subscription not found for Stripe ID: ${stripeSubId}`);
    }

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

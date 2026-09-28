import {
  PaymentsService,
  invoiceSubscriptionId,
  mapStripePriceToPlan,
  resolvePaidPlan,
  subscriptionPeriod,
} from './payments.service';
import { StripeWebhookStoreService } from './stripe-webhook-store.service';
import { StripeAlertService } from './stripe-alert.service';
import type Stripe from 'stripe';
import * as observability from '../../observability';

function mockCheckoutEvent(
  overrides: {
    id?: string;
    userId?: string;
    plan?: string;
    priceId?: string;
    cancelAtPeriodEnd?: boolean;
  } = {}
): Stripe.Event {
  const priceId = overrides.priceId ?? 'price_pro_month';
  return {
    id: overrides.id ?? 'evt_checkout',
    type: 'checkout.session.completed',
    data: {
      object: {
        id: 'cs_1',
        client_reference_id: overrides.userId ?? 'user-1',
        metadata: overrides.plan
          ? { plan: overrides.plan, userId: overrides.userId ?? 'user-1' }
          : { userId: overrides.userId ?? 'user-1' },
        customer: 'cus_1',
        subscription: 'sub_1',
      },
    },
  } as never;
}

function mockSubscriptionEvent(overrides: {
  id?: string;
  cancelAtPeriodEnd: boolean;
  status?: string;
  plan?: string;
}): Stripe.Event {
  return {
    id: overrides.id ?? 'evt_sub_updated',
    type: 'customer.subscription.updated',
    data: {
      object: {
        id: 'sub_1',
        customer: 'cus_1',
        status: overrides.status ?? 'active',
        cancel_at_period_end: overrides.cancelAtPeriodEnd,
        current_period_start: 1_700_000_000,
        current_period_end: 1_700_086_400,
        metadata: { userId: 'user-1', plan: overrides.plan ?? 'pro' },
        items: { data: [{ price: { id: 'price_pro_month' } }] },
      },
    },
  } as never;
}

describe('PaymentsService webhook fail-closed', () => {
  const prisma = {
    subscription: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      upsert: jest.fn(),
    },
    payment: { create: jest.fn(), findMany: jest.fn() },
    invoice: { upsert: jest.fn() },
    user: { update: jest.fn(), findFirst: jest.fn() },
  };

  const subscriptions = {
    applyPaidEntitlement: jest.fn().mockResolvedValue(undefined),
  };

  const mail = {
    sendPaymentFailed: jest.fn().mockResolvedValue(undefined),
  };

  const webhookStore = {
    isProcessed: jest.fn(),
    acquireProcessingLock: jest.fn().mockResolvedValue(true),
    releaseProcessingLock: jest.fn().mockResolvedValue(undefined),
    markProcessing: jest.fn().mockResolvedValue(true),
    markProcessed: jest.fn().mockResolvedValue(undefined),
    incrementAttempts: jest.fn().mockResolvedValue(1),
    pushDlq: jest.fn().mockResolvedValue(undefined),
    listDlq: jest.fn().mockResolvedValue([]),
    reclaimFromDlq: jest.fn().mockResolvedValue(undefined),
  };

  const alerts = {
    captureException: jest.fn(),
  };

  let service: PaymentsService;

  function attachStripeRetrieve(
    priceId = 'price_pro_month',
    cancelAtPeriodEnd = false,
    metadata: Record<string, string> = {}
  ) {
    const retrieve = jest.fn().mockResolvedValue({
      id: 'sub_1',
      customer: 'cus_1',
      status: 'active',
      cancel_at_period_end: cancelAtPeriodEnd,
      current_period_start: 1_700_000_000,
      current_period_end: 1_700_086_400,
      metadata,
      items: { data: [{ price: { id: priceId } }] },
    });
    (service as unknown as { stripe: unknown }).stripe = {
      subscriptions: { retrieve, list: jest.fn().mockResolvedValue({ data: [] }) },
    };
    return retrieve;
  }

  function silenceBackoff() {
    jest.spyOn(global, 'setTimeout').mockImplementation((fn: TimerHandler) => {
      if (typeof fn === 'function') fn();
      return 0 as unknown as NodeJS.Timeout;
    });
  }

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.STRIPE_SECRET_KEY = 'sk_test_real';
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_real';
    process.env.STRIPE_PRICE_PRO_MONTHLY = 'price_pro_month';
    process.env.STRIPE_PRICE_BUSINESS_MONTHLY = 'price_biz_month';
    delete process.env.STRIPE_FAIL_CLOSED;
    delete process.env.NODE_ENV;
    webhookStore.acquireProcessingLock.mockResolvedValue(true);
    webhookStore.markProcessing.mockResolvedValue(true);
    webhookStore.isProcessed.mockResolvedValue(false);

    service = new PaymentsService(
      prisma as never,
      subscriptions as never,
      mail as never,
      webhookStore as never,
      alerts as never
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('rejects webhooks when Stripe is not configured (no soft-ack)', async () => {
    const prevKey = process.env.STRIPE_SECRET_KEY;
    const prevSecret = process.env.STRIPE_WEBHOOK_SECRET;
    const prevEnv = process.env.NODE_ENV;
    const prevFail = process.env.STRIPE_FAIL_CLOSED;
    process.env.STRIPE_SECRET_KEY = 'sk_test_xxx';
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_xxx';
    process.env.NODE_ENV = 'development';
    delete process.env.STRIPE_FAIL_CLOSED;
    try {
      const unconfigured = new PaymentsService(
        prisma as never,
        subscriptions as never,
        mail as never,
        webhookStore as never,
        alerts as never
      );
      await expect(
        unconfigured.handleStripeWebhook(Buffer.from('{"type":"charge.succeeded"}'), 'invalid_sig')
      ).rejects.toMatchObject({
        response: expect.objectContaining({ code: 'STRIPE_NOT_CONFIGURED' }),
      });
      expect(webhookStore.markProcessed).not.toHaveBeenCalled();
    } finally {
      process.env.STRIPE_SECRET_KEY = prevKey;
      process.env.STRIPE_WEBHOOK_SECRET = prevSecret;
      process.env.NODE_ENV = prevEnv;
      process.env.STRIPE_FAIL_CLOSED = prevFail;
    }
  });

  describe('webhook signature (account + Connect endpoints)', () => {
    const payload = JSON.stringify({ id: 'evt_sig', object: 'event', type: 'account.updated' });

    function signedWith(secret: string) {
      const stripe = (service as unknown as { stripe: Stripe }).stripe;
      return stripe.webhooks.generateTestHeaderString({ payload, secret });
    }

    beforeEach(() => {
      process.env.STRIPE_CONNECT_WEBHOOK_SECRET = 'whsec_connect';
      jest.spyOn(service, 'processEventWithRetry').mockResolvedValue(undefined);
    });

    afterEach(() => {
      delete process.env.STRIPE_CONNECT_WEBHOOK_SECRET;
    });

    it('accepts an event signed by the account endpoint secret', async () => {
      await expect(
        service.handleStripeWebhook(Buffer.from(payload), signedWith('whsec_real'))
      ).resolves.toEqual({ received: true });
      expect(service.processEventWithRetry).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'evt_sig' })
      );
    });

    it('accepts an event signed by the Connect endpoint secret', async () => {
      await expect(
        service.handleStripeWebhook(Buffer.from(payload), signedWith('whsec_connect'))
      ).resolves.toEqual({ received: true });
    });

    it('rejects a Connect event when STRIPE_CONNECT_WEBHOOK_SECRET is not set', async () => {
      delete process.env.STRIPE_CONNECT_WEBHOOK_SECRET;
      await expect(
        service.handleStripeWebhook(Buffer.from(payload), signedWith('whsec_connect'))
      ).rejects.toMatchObject({ response: expect.objectContaining({ code: 'INVALID_WEBHOOK' }) });
      expect(service.processEventWithRetry).not.toHaveBeenCalled();
    });

    it('rejects an event signed by an unknown secret', async () => {
      await expect(
        service.handleStripeWebhook(Buffer.from(payload), signedWith('whsec_attacker'))
      ).rejects.toMatchObject({ response: expect.objectContaining({ code: 'INVALID_WEBHOOK' }) });
      expect(service.processEventWithRetry).not.toHaveBeenCalled();
    });
  });

  it('skips already processed events (idempotency)', async () => {
    webhookStore.isProcessed.mockResolvedValue(true);
    await service.processEventWithRetry({
      id: 'evt_123',
      type: 'checkout.session.completed',
      data: { object: {} },
    } as never);
    expect(subscriptions.applyPaidEntitlement).not.toHaveBeenCalled();
    expect(webhookStore.markProcessed).not.toHaveBeenCalled();
    expect(webhookStore.acquireProcessingLock).not.toHaveBeenCalled();
  });

  it('handles checkout.session.completed and marks processed', async () => {
    attachStripeRetrieve();

    await service.processEventWithRetry(mockCheckoutEvent({ plan: 'pro', userId: 'user-1' }));

    expect(subscriptions.applyPaidEntitlement).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        plan: 'pro',
        provider: 'stripe',
        stripeSubscriptionId: 'sub_1',
        stripeCustomerId: 'cus_1',
        cancelAtPeriodEnd: false,
      })
    );
    expect(webhookStore.markProcessed).toHaveBeenCalledWith('evt_checkout');
    expect(webhookStore.releaseProcessingLock).toHaveBeenCalledWith('evt_checkout');
  });

  it('fulfills marketplace checkout without applying a subscription', async () => {
    const marketplace = { fulfillCheckoutSession: jest.fn().mockResolvedValue(null) };
    service = new PaymentsService(
      prisma as never,
      subscriptions as never,
      mail as never,
      webhookStore as never,
      alerts as never,
      marketplace as never
    );

    await service.processEventWithRetry({
      id: 'evt_mp_checkout',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_mp',
          metadata: { type: 'marketplace', listingId: 'listing-1', buyerId: 'buyer-1' },
          payment_intent: 'pi_1',
        },
      },
    } as never);

    expect(marketplace.fulfillCheckoutSession).toHaveBeenCalled();
    expect(subscriptions.applyPaidEntitlement).not.toHaveBeenCalled();
    expect(webhookStore.markProcessed).toHaveBeenCalledWith('evt_mp_checkout');
  });

  it('syncs Connect account.updated without touching subscriptions', async () => {
    const marketplace = { syncConnectedAccountFromWebhook: jest.fn().mockResolvedValue(null) };
    service = new PaymentsService(
      prisma as never,
      subscriptions as never,
      mail as never,
      webhookStore as never,
      alerts as never,
      marketplace as never
    );

    await service.processEventWithRetry({
      id: 'evt_acct',
      type: 'account.updated',
      data: {
        object: { id: 'acct_1', payouts_enabled: true, details_submitted: true },
      },
    } as never);

    expect(marketplace.syncConnectedAccountFromWebhook).toHaveBeenCalled();
    expect(subscriptions.applyPaidEntitlement).not.toHaveBeenCalled();
    expect(webhookStore.markProcessed).toHaveBeenCalledWith('evt_acct');
  });

  it('retries on transient error then succeeds', async () => {
    let attempts = 0;
    subscriptions.applyPaidEntitlement.mockImplementation(async () => {
      attempts++;
      if (attempts < 2) throw new Error('Network timeout');
    });
    attachStripeRetrieve();
    silenceBackoff();

    await service.processEventWithRetry(mockCheckoutEvent({ plan: 'pro' }));

    expect(attempts).toBe(2);
    expect(webhookStore.markProcessed).toHaveBeenCalledWith('evt_checkout');
  });

  it('sends to DLQ and alerts on permanent error', async () => {
    subscriptions.applyPaidEntitlement.mockRejectedValue(new Error('Permanent'));
    attachStripeRetrieve();
    silenceBackoff();

    await expect(
      service.processEventWithRetry(mockCheckoutEvent({ id: 'evt_dlq', plan: 'pro' }))
    ).rejects.toThrow('Permanent');

    expect(webhookStore.pushDlq).toHaveBeenCalledWith(
      expect.objectContaining({ eventId: 'evt_dlq', eventType: 'checkout.session.completed' })
    );
    expect(alerts.captureException).toHaveBeenCalled();
    expect(webhookStore.releaseProcessingLock).toHaveBeenCalledWith('evt_dlq');
  });

  it('handles invoice.paid and records a Stripe payment', async () => {
    prisma.subscription.findFirst.mockResolvedValue({
      id: 'local-sub',
      userId: 'user-1',
    });
    prisma.payment.create.mockResolvedValue({});
    prisma.invoice.upsert.mockResolvedValue({});

    await service.processEventWithRetry({
      id: 'evt_invoice_paid',
      type: 'invoice.paid',
      data: {
        object: {
          id: 'in_paid',
          number: 'INV-42',
          subscription: 'sub_1',
          amount_paid: 999,
          currency: 'usd',
          payment_intent: 'pi_1',
          created: 1_700_000_000,
        },
      },
    } as never);

    expect(prisma.payment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'completed',
          paymentMethod: 'stripe',
          transactionId: 'in_paid',
          stripePaymentIntentId: 'pi_1',
          amount: 9.99,
        }),
      })
    );
    expect(prisma.invoice.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { invoiceNumber: 'INV-42' },
        create: expect.objectContaining({ status: 'paid' }),
      })
    );
    expect(subscriptions.applyPaidEntitlement).not.toHaveBeenCalled();
    expect(webhookStore.markProcessed).toHaveBeenCalledWith('evt_invoice_paid');
  });

  it('handles invoice.payment_failed with email alert', async () => {
    prisma.subscription.findFirst.mockResolvedValue({
      id: 'local-sub',
      userId: 'user-1',
      user: { email: 'u@example.com' },
    });
    prisma.subscription.update.mockResolvedValue({});
    prisma.payment.create.mockResolvedValue({});

    await service.processEventWithRetry({
      id: 'evt_fail',
      type: 'invoice.payment_failed',
      data: {
        object: {
          id: 'in_fail',
          subscription: 'sub_stripe',
          amount_due: 1999,
          currency: 'usd',
          next_payment_attempt: null,
        },
      },
    } as never);

    expect(mail.sendPaymentFailed).toHaveBeenCalledWith(
      'u@example.com',
      expect.objectContaining({ amount: 19.99, currency: 'USD' })
    );
    expect(webhookStore.markProcessed).toHaveBeenCalledWith('evt_fail');
  });

  describe('events rendered in a newer Stripe API version (2025-03-31.basil+)', () => {
    beforeEach(() => {
      subscriptions.applyPaidEntitlement.mockReset().mockResolvedValue(undefined);
      prisma.subscription.findUnique.mockReset().mockResolvedValue(null);
    });

    it('reads the billing period from the subscription item', async () => {
      const event = mockSubscriptionEvent({ cancelAtPeriodEnd: false, plan: 'pro' });
      const sub = event.data.object as unknown as Record<string, unknown>;
      delete sub.current_period_start;
      delete sub.current_period_end;
      sub.items = {
        data: [
          {
            price: { id: 'price_pro_month' },
            current_period_start: 1_800_000_000,
            current_period_end: 1_802_592_000,
          },
        ],
      };

      await service.processEventWithRetry(event);

      expect(subscriptions.applyPaidEntitlement).toHaveBeenCalledWith(
        expect.objectContaining({
          periodStart: new Date(1_800_000_000 * 1000),
          periodEnd: new Date(1_802_592_000 * 1000),
        })
      );
    });

    it('finds the subscription of an invoice through invoice.parent', async () => {
      prisma.subscription.findFirst.mockResolvedValue({ id: 'local-sub', userId: 'user-1' });
      prisma.payment.create.mockResolvedValue({});
      prisma.invoice.upsert.mockResolvedValue({});

      await service.processEventWithRetry({
        id: 'evt_basil_invoice',
        type: 'invoice.paid',
        data: {
          object: {
            id: 'in_basil',
            number: 'INV-43',
            parent: { subscription_details: { subscription: 'sub_1' } },
            amount_paid: 999,
            currency: 'eur',
            created: 1_800_000_000,
          },
        },
      } as never);

      expect(prisma.subscription.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: { stripeSubscriptionId: 'sub_1' } })
      );
      expect(prisma.payment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ transactionId: 'in_basil', currency: 'EUR' }),
        })
      );
    });
  });

  describe('invoice received before checkout.session.completed', () => {
    beforeEach(() => {
      subscriptions.applyPaidEntitlement.mockReset().mockResolvedValue(undefined);
      prisma.subscription.findUnique.mockReset().mockResolvedValue(null);
    });

    const invoiceEvent = {
      id: 'evt_early_invoice',
      type: 'invoice.paid',
      data: {
        object: {
          id: 'in_first',
          number: 'INV-1',
          subscription: 'sub_1',
          amount_paid: 0,
          currency: 'eur',
          created: 1_700_000_000,
        },
      },
    } as never;

    it('syncs the subscription from Stripe, then records the payment', async () => {
      prisma.subscription.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValue({ id: 'local-sub', userId: 'user-1' });
      prisma.subscription.findUnique.mockResolvedValue(null);
      prisma.payment.create.mockResolvedValue({});
      prisma.invoice.upsert.mockResolvedValue({});
      const retrieve = attachStripeRetrieve('price_pro_month', false, { userId: 'user-1' });

      await service.processEventWithRetry(invoiceEvent);

      expect(retrieve).toHaveBeenCalledWith('sub_1');
      expect(subscriptions.applyPaidEntitlement).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'user-1', plan: 'pro', stripeSubscriptionId: 'sub_1' })
      );
      expect(prisma.payment.create).toHaveBeenCalled();
      expect(webhookStore.markProcessed).toHaveBeenCalledWith('evt_early_invoice');
    });

    it('still fails when the Stripe subscription names no user', async () => {
      prisma.subscription.findFirst.mockResolvedValue(null);
      attachStripeRetrieve('price_pro_month', false, {});
      silenceBackoff();

      await expect(service.processEventWithRetry(invoiceEvent)).rejects.toThrow(
        /Subscription not found/
      );
      expect(subscriptions.applyPaidEntitlement).not.toHaveBeenCalled();
      expect(prisma.payment.create).not.toHaveBeenCalled();
    });
  });

  describe('confirmCheckoutSession (return from Stripe Checkout)', () => {
    const paidInvoice = {
      id: 'in_first',
      number: 'INV-1',
      status: 'paid',
      subscription: 'sub_1',
      amount_paid: 0,
      currency: 'eur',
      created: 1_700_000_000,
    };

    function attachSession(session: Record<string, unknown> | Error) {
      const retrieveSub = attachStripeRetrieve('price_pro_month', false, { userId: 'user-1' });
      const retrieveSession =
        session instanceof Error
          ? jest.fn().mockRejectedValue(session)
          : jest.fn().mockResolvedValue({
              id: 'cs_test_1',
              mode: 'subscription',
              status: 'complete',
              client_reference_id: 'user-1',
              metadata: { userId: 'user-1', plan: 'pro' },
              customer: 'cus_1',
              subscription: 'sub_1',
              invoice: paidInvoice,
              ...session,
            });
      (service as unknown as { stripe: Record<string, unknown> }).stripe = {
        subscriptions: { retrieve: retrieveSub, list: jest.fn().mockResolvedValue({ data: [] }) },
        checkout: { sessions: { retrieve: retrieveSession } },
      };
      return retrieveSession;
    }

    beforeEach(() => {
      subscriptions.applyPaidEntitlement.mockReset().mockResolvedValue(undefined);
      prisma.subscription.findUnique.mockReset().mockResolvedValue(null);
      prisma.subscription.findFirst
        .mockReset()
        .mockResolvedValue({ id: 'local-sub', userId: 'user-1' });
      prisma.payment.create.mockReset().mockResolvedValue({});
      prisma.invoice.upsert.mockReset().mockResolvedValue({});
    });

    it('reads the session from Stripe, grants the plan and records the first invoice', async () => {
      const retrieveSession = attachSession({});

      await expect(service.confirmCheckoutSession('user-1', 'cs_test_1')).resolves.toEqual({
        confirmed: true,
      });

      expect(retrieveSession).toHaveBeenCalledWith('cs_test_1', { expand: ['invoice'] });
      expect(subscriptions.applyPaidEntitlement).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'user-1', plan: 'pro', stripeSubscriptionId: 'sub_1' })
      );
      expect(prisma.invoice.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ where: { invoiceNumber: 'INV-1' } })
      );
    });

    it("refuses another user's session without revealing it", async () => {
      attachSession({ client_reference_id: 'user-2', metadata: { userId: 'user-2' } });

      await expect(service.confirmCheckoutSession('user-1', 'cs_test_1')).rejects.toMatchObject({
        response: { code: 'CHECKOUT_SESSION_NOT_FOUND' },
      });
      expect(subscriptions.applyPaidEntitlement).not.toHaveBeenCalled();
    });

    it('refuses a one-off (marketplace) payment session', async () => {
      attachSession({ mode: 'payment', metadata: { type: 'marketplace', userId: 'user-1' } });

      await expect(service.confirmCheckoutSession('user-1', 'cs_test_1')).rejects.toMatchObject({
        response: { code: 'CHECKOUT_SESSION_NOT_FOUND' },
      });
      expect(subscriptions.applyPaidEntitlement).not.toHaveBeenCalled();
    });

    it('grants nothing while the session is not complete', async () => {
      attachSession({ status: 'open', invoice: null });

      await expect(service.confirmCheckoutSession('user-1', 'cs_test_1')).resolves.toEqual({
        confirmed: false,
      });
      expect(subscriptions.applyPaidEntitlement).not.toHaveBeenCalled();
    });

    it('does not record an unpaid invoice', async () => {
      attachSession({ invoice: { ...paidInvoice, status: 'open' } });

      await service.confirmCheckoutSession('user-1', 'cs_test_1');
      expect(subscriptions.applyPaidEntitlement).toHaveBeenCalled();
      expect(prisma.invoice.upsert).not.toHaveBeenCalled();
    });

    it('maps an unknown session to 404 and a Stripe outage to 503', async () => {
      attachSession(
        Object.assign(new Error('No such checkout.session'), { code: 'resource_missing' })
      );
      await expect(service.confirmCheckoutSession('user-1', 'cs_test_x')).rejects.toMatchObject({
        response: { code: 'CHECKOUT_SESSION_NOT_FOUND' },
      });

      attachSession(new Error('socket hang up'));
      await expect(service.confirmCheckoutSession('user-1', 'cs_test_x')).rejects.toMatchObject({
        response: { code: 'STRIPE_UNAVAILABLE' },
      });
    });

    it('treats a row created at the same moment by the webhook as confirmed', async () => {
      attachSession({});
      const { Prisma } = jest.requireActual('@prisma/client');
      subscriptions.applyPaidEntitlement.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Unique constraint', {
          code: 'P2002',
          clientVersion: 'test',
        })
      );

      await expect(service.confirmCheckoutSession('user-1', 'cs_test_1')).resolves.toEqual({
        confirmed: true,
      });
    });

    it('fails closed when Stripe is not configured', async () => {
      (service as unknown as { stripe: null }).stripe = null;
      await expect(service.confirmCheckoutSession('user-1', 'cs_test_1')).rejects.toMatchObject({
        response: { code: 'STRIPE_NOT_CONFIGURED' },
      });
    });
  });

  describe('P0-1: Lock Processing', () => {
    it('should prevent double processing with 2 concurrent webhooks', async () => {
      let lockHeld = false;
      webhookStore.acquireProcessingLock.mockImplementation(async () => {
        if (lockHeld) return false;
        lockHeld = true;
        return true;
      });
      webhookStore.releaseProcessingLock.mockImplementation(async () => {
        lockHeld = false;
      });

      let started = 0;
      subscriptions.applyPaidEntitlement.mockImplementation(async () => {
        started += 1;
        await new Promise((r) => setTimeout(r, 30));
      });
      attachStripeRetrieve();

      const event = mockCheckoutEvent({ id: 'evt_race', plan: 'pro' });
      const [r1, r2] = await Promise.allSettled([
        service.processEventWithRetry(event),
        service.processEventWithRetry(event),
      ]);

      expect(r1.status).toBe('fulfilled');
      expect(r2.status).toBe('fulfilled');
      expect(subscriptions.applyPaidEntitlement).toHaveBeenCalledTimes(1);
      expect(webhookStore.markProcessed).toHaveBeenCalledTimes(1);
    });

    it('should skip when redis lock is not acquired', async () => {
      webhookStore.acquireProcessingLock.mockResolvedValue(false);
      attachStripeRetrieve();

      await service.processEventWithRetry(mockCheckoutEvent({ plan: 'pro' }));

      expect(subscriptions.applyPaidEntitlement).not.toHaveBeenCalled();
      expect(webhookStore.markProcessing).not.toHaveBeenCalled();
    });

    it('should skip when DB claim fails (already processed)', async () => {
      webhookStore.markProcessing.mockResolvedValue(false);
      attachStripeRetrieve();

      await service.processEventWithRetry(mockCheckoutEvent({ plan: 'pro' }));

      expect(subscriptions.applyPaidEntitlement).not.toHaveBeenCalled();
      expect(webhookStore.releaseProcessingLock).toHaveBeenCalled();
    });
  });

  describe('P0-2: Plan Missing Throw', () => {
    it('should throw if plan is unknown (price + metadata)', async () => {
      attachStripeRetrieve('price_unknown', false, {});
      silenceBackoff();

      await expect(
        service.processEventWithRetry(
          mockCheckoutEvent({ id: 'evt_unknown_plan', priceId: 'price_unknown' })
        )
      ).rejects.toThrow(/Unknown plan/);

      expect(subscriptions.applyPaidEntitlement).not.toHaveBeenCalled();
      expect(webhookStore.pushDlq).toHaveBeenCalled();
    });

    it('mapStripePriceToPlan returns null for unknown price', () => {
      expect(mapStripePriceToPlan('unknown_price_123')).toBeNull();
      expect(mapStripePriceToPlan(null)).toBeNull();
    });

    it('mapStripePriceToPlan returns pro for configured price', () => {
      expect(mapStripePriceToPlan('price_pro_month')).toBe('pro');
      expect(mapStripePriceToPlan('price_biz_month')).toBe('business');
    });

    it('resolvePaidPlan throws if plan is null', () => {
      const session = { id: 'cs_x', metadata: {} } as Stripe.Checkout.Session;
      const sub = {
        metadata: {},
        items: { data: [{ price: { id: 'price_unknown' } }] },
      } as unknown as Stripe.Subscription;
      expect(() => resolvePaidPlan(session, sub)).toThrow(/Unknown plan/);
    });

    it('should succeed if plan is valid via metadata', async () => {
      attachStripeRetrieve('price_unknown');
      await service.processEventWithRetry(mockCheckoutEvent({ plan: 'pro' }));
      expect(subscriptions.applyPaidEntitlement).toHaveBeenCalledWith(
        expect.objectContaining({ plan: 'pro' })
      );
    });

    it('should succeed if plan is valid via price id', async () => {
      attachStripeRetrieve('price_biz_month', false, {});
      await service.processEventWithRetry(mockCheckoutEvent({ userId: 'user-1' }));
      expect(subscriptions.applyPaidEntitlement).toHaveBeenCalledWith(
        expect.objectContaining({ plan: 'business' })
      );
    });
  });

  describe('P0-3: cancelAtPeriodEnd Mapping', () => {
    it('should map cancel_at_period_end=true without dropping the paid plan', async () => {
      await service.processEventWithRetry(
        mockSubscriptionEvent({ cancelAtPeriodEnd: true, plan: 'pro' })
      );

      expect(subscriptions.applyPaidEntitlement).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          plan: 'pro',
          status: 'active',
          cancelAtPeriodEnd: true,
        })
      );
    });

    it('should map cancel_at_period_end=false (reactivation)', async () => {
      await service.processEventWithRetry(
        mockSubscriptionEvent({ cancelAtPeriodEnd: false, plan: 'pro' })
      );

      expect(subscriptions.applyPaidEntitlement).toHaveBeenCalledWith(
        expect.objectContaining({
          plan: 'pro',
          status: 'active',
          cancelAtPeriodEnd: false,
        })
      );
    });

    it('should set plan free only when Stripe status is fully canceled', async () => {
      await service.processEventWithRetry(
        mockSubscriptionEvent({ cancelAtPeriodEnd: false, status: 'canceled', plan: 'pro' })
      );

      expect(subscriptions.applyPaidEntitlement).toHaveBeenCalledWith(
        expect.objectContaining({
          plan: 'free',
          status: 'canceled',
          cancelAtPeriodEnd: false,
        })
      );
    });
  });
  describe('one live Stripe subscription per user', () => {
    let alert: jest.SpyInstance;
    beforeEach(() => {
      prisma.subscription.findUnique.mockReset().mockResolvedValue(null);
      alert = jest.spyOn(observability, 'emitSecurityAlert').mockImplementation();
    });
    afterEach(() => alert.mockRestore());

    function attachStripe(
      previous: Record<string, unknown> | Error,
      customerSubs: Array<Record<string, unknown>> = []
    ) {
      const current = {
        id: 'sub_1',
        customer: 'cus_1',
        status: 'active',
        cancel_at_period_end: false,
        current_period_start: 1_700_000_000,
        current_period_end: 1_700_086_400,
        metadata: {},
        items: { data: [{ price: { id: 'price_biz_month' } }] },
      };
      const retrieve = jest.fn(async (id: string) => {
        if (id === 'sub_1') return current;
        if (previous instanceof Error) throw previous;
        return previous;
      });
      const cancel = jest.fn().mockResolvedValue({ id: 'sub_old', status: 'canceled' });
      const list = jest.fn().mockResolvedValue({ data: [current, ...customerSubs] });
      (service as unknown as { stripe: unknown }).stripe = {
        subscriptions: { retrieve, cancel, list },
      };
      return { retrieve, cancel, list };
    }

    it('cancels live subscriptions the database never knew about (duplicate Checkouts)', async () => {
      // Real case: three Pro Checkouts then a Business one, none recorded before the next.
      const { cancel, list } = attachStripe(new Error('not used'), [
        { id: 'sub_pro_a', status: 'trialing' },
        { id: 'sub_pro_b', status: 'active' },
        { id: 'sub_pro_c', status: 'past_due' },
        { id: 'sub_ended', status: 'canceled' },
      ]);

      await service.processEventWithRetry(mockCheckoutEvent({ plan: 'business' }));

      expect(list).toHaveBeenCalledWith(
        expect.objectContaining({ customer: 'cus_1', status: 'all' })
      );
      expect(cancel.mock.calls.map(([id]) => id).sort()).toEqual([
        'sub_pro_a',
        'sub_pro_b',
        'sub_pro_c',
      ]);
      expect(cancel).toHaveBeenCalledWith('sub_pro_a', { prorate: true });
      expect(cancel).not.toHaveBeenCalledWith('sub_1', expect.anything());
      expect(Math.max(...cancel.mock.invocationCallOrder)).toBeLessThan(
        subscriptions.applyPaidEntitlement.mock.invocationCallOrder[0]
      );
      expect(subscriptions.applyPaidEntitlement).toHaveBeenCalledWith(
        expect.objectContaining({ stripeSubscriptionId: 'sub_1', plan: 'business' })
      );
      expect(alert).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'PAY-04',
          extra: expect.objectContaining({ kept: 'sub_1' }),
        })
      );
    });

    it('fails (and is retried) when Stripe cannot list the customer subscriptions', async () => {
      const { list } = attachStripe(new Error('not used'));
      list.mockRejectedValue(new Error('Stripe down'));
      silenceBackoff();

      await expect(
        service.processEventWithRetry(mockCheckoutEvent({ plan: 'business' }))
      ).rejects.toThrow('Stripe down');
      expect(subscriptions.applyPaidEntitlement).not.toHaveBeenCalled();
    });

    it('cancels the database one only once when Stripe lists it too', async () => {
      prisma.subscription.findUnique.mockResolvedValue({ stripeSubscriptionId: 'sub_old' });
      const { cancel } = attachStripe({ id: 'sub_old', status: 'active' }, [
        { id: 'sub_old', status: 'active' },
      ]);

      await service.processEventWithRetry(mockCheckoutEvent({ plan: 'business' }));

      expect(cancel).toHaveBeenCalledTimes(1);
      expect(cancel).toHaveBeenCalledWith('sub_old', { prorate: true });
    });

    it('cancels the previous live subscription when a second checkout completes', async () => {
      prisma.subscription.findUnique.mockResolvedValue({ stripeSubscriptionId: 'sub_old' });
      const { cancel } = attachStripe({ id: 'sub_old', status: 'active' });

      await service.processEventWithRetry(mockCheckoutEvent({ plan: 'business' }));

      expect(cancel).toHaveBeenCalledWith('sub_old', { prorate: true });
      // Replacing the recorded subscription is a plan change, not a duplicate: no alert.
      expect(alert).not.toHaveBeenCalled();
      expect(cancel.mock.invocationCallOrder[0]).toBeLessThan(
        subscriptions.applyPaidEntitlement.mock.invocationCallOrder[0]
      );
      expect(subscriptions.applyPaidEntitlement).toHaveBeenCalledWith(
        expect.objectContaining({ stripeSubscriptionId: 'sub_1', plan: 'business' })
      );
    });

    it('leaves an already ended previous subscription alone', async () => {
      prisma.subscription.findUnique.mockResolvedValue({ stripeSubscriptionId: 'sub_old' });
      const { cancel } = attachStripe({ id: 'sub_old', status: 'canceled' });

      await service.processEventWithRetry(mockCheckoutEvent({ plan: 'business' }));

      expect(cancel).not.toHaveBeenCalled();
      expect(subscriptions.applyPaidEntitlement).toHaveBeenCalled();
    });

    it('does not cancel anything when the checkout is for the current subscription', async () => {
      prisma.subscription.findUnique.mockResolvedValue({ stripeSubscriptionId: 'sub_1' });
      const { cancel } = attachStripe({ id: 'sub_old', status: 'active' });

      await service.processEventWithRetry(mockCheckoutEvent({ plan: 'business' }));

      expect(cancel).not.toHaveBeenCalled();
    });

    it('ignores events for a replaced subscription so the user is not downgraded', async () => {
      prisma.subscription.findUnique.mockResolvedValue({ stripeSubscriptionId: 'sub_new' });

      await service.processEventWithRetry(
        mockSubscriptionEvent({ cancelAtPeriodEnd: false, status: 'canceled', plan: 'pro' })
      );

      expect(subscriptions.applyPaidEntitlement).not.toHaveBeenCalled();
      expect(webhookStore.markProcessed).toHaveBeenCalled();
    });

    it('resolves the plan from the billed price before stale metadata', async () => {
      const event = mockSubscriptionEvent({ cancelAtPeriodEnd: false, plan: 'pro' });
      (event.data.object as { items: unknown }).items = {
        data: [{ price: { id: 'price_biz_month' } }],
      };

      await service.processEventWithRetry(event);

      expect(subscriptions.applyPaidEntitlement).toHaveBeenCalledWith(
        expect.objectContaining({ plan: 'business' })
      );
    });
  });
});

describe('StripeWebhookStoreService helpers', () => {
  it('exports store and alert classes', () => {
    expect(StripeWebhookStoreService).toBeDefined();
    expect(StripeAlertService).toBeDefined();
  });
});

describe('Stripe API version helpers', () => {
  it('subscriptionPeriod prefers the subscription fields, then the first item', () => {
    expect(
      subscriptionPeriod({
        id: 'sub_old',
        current_period_start: 10,
        current_period_end: 20,
      } as unknown as Stripe.Subscription)
    ).toEqual({ start: new Date(10_000), end: new Date(20_000) });
    expect(
      subscriptionPeriod({
        id: 'sub_new',
        items: { data: [{ current_period_start: 30, current_period_end: 40 }] },
      } as unknown as Stripe.Subscription)
    ).toEqual({ start: new Date(30_000), end: new Date(40_000) });
    expect(() =>
      subscriptionPeriod({ id: 'sub_x', items: { data: [] } } as unknown as Stripe.Subscription)
    ).toThrow(/no billing period/);
  });

  it('invoiceSubscriptionId reads invoice.subscription or invoice.parent', () => {
    expect(invoiceSubscriptionId({ subscription: 'sub_a' } as unknown as Stripe.Invoice)).toBe(
      'sub_a'
    );
    expect(
      invoiceSubscriptionId({ subscription: { id: 'sub_b' } } as unknown as Stripe.Invoice)
    ).toBe('sub_b');
    expect(
      invoiceSubscriptionId({
        parent: { subscription_details: { subscription: 'sub_c' } },
      } as unknown as Stripe.Invoice)
    ).toBe('sub_c');
    expect(
      invoiceSubscriptionId({ id: 'in_one_off' } as unknown as Stripe.Invoice)
    ).toBeUndefined();
  });
});

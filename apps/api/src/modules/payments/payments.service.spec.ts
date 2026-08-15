import { PaymentsService, mapStripePriceToPlan, resolvePaidPlan } from './payments.service';
import { StripeWebhookStoreService } from './stripe-webhook-store.service';
import { StripeAlertService } from './stripe-alert.service';
import type Stripe from 'stripe';

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
      status: 'active',
      cancel_at_period_end: cancelAtPeriodEnd,
      current_period_start: 1_700_000_000,
      current_period_end: 1_700_086_400,
      metadata,
      items: { data: [{ price: { id: priceId } }] },
    });
    (service as unknown as { stripe: { subscriptions: { retrieve: typeof retrieve } } }).stripe = {
      subscriptions: { retrieve },
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
        cancelAtPeriodEnd: false,
      })
    );
    expect(webhookStore.markProcessed).toHaveBeenCalledWith('evt_checkout');
    expect(webhookStore.releaseProcessingLock).toHaveBeenCalledWith('evt_checkout');
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
});

describe('StripeWebhookStoreService helpers', () => {
  it('exports store and alert classes', () => {
    expect(StripeWebhookStoreService).toBeDefined();
    expect(StripeAlertService).toBeDefined();
  });
});

describe('PaymentsService.getStatus', () => {
  const prisma = {
    payment: { findUnique: jest.fn() },
  };

  const service = new PaymentsService(
    prisma as never,
    { applyPaidEntitlement: jest.fn() } as never,
    { sendPaymentFailed: jest.fn() } as never,
    {} as never,
    { captureException: jest.fn() } as never
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns payment status for the owning user', async () => {
    prisma.payment.findUnique.mockResolvedValue({
      status: 'pending',
      paymentMethod: 'cinetpay',
      subscription: { userId: 'user-1' },
    });

    await expect(service.getStatus('user-1', 'tx_123')).resolves.toEqual({
      status: 'pending',
      paymentMethod: 'cinetpay',
      transactionId: 'tx_123',
    });
  });

  it('hides payments owned by another user', async () => {
    prisma.payment.findUnique.mockResolvedValue({
      status: 'completed',
      paymentMethod: 'cinetpay',
      subscription: { userId: 'user-1' },
    });

    await expect(service.getStatus('other-user', 'tx_123')).resolves.toEqual({
      status: 'not_found',
      transactionId: 'tx_123',
    });
  });

  it('returns not_found when the transaction is missing', async () => {
    prisma.payment.findUnique.mockResolvedValue(null);

    await expect(service.getStatus('user-1', 'missing')).resolves.toEqual({
      status: 'not_found',
      transactionId: 'missing',
    });
  });
});

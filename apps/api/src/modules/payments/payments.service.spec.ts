import { PaymentsService } from './payments.service';
import { StripeWebhookStoreService } from './stripe-webhook-store.service';
import { StripeAlertService } from './stripe-alert.service';

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
    user: {
      update: jest.fn(),
      findFirst: jest.fn().mockResolvedValue({
        email: 'user@example.com',
        firstName: 'Test',
        lastName: 'User',
      }),
    },
  };

  const subscriptions = {
    applyStripeSubscription: jest.fn().mockResolvedValue(undefined),
  };

  const mail = {
    sendPaymentFailed: jest.fn().mockResolvedValue(undefined),
    sendSubscriptionCancelScheduled: jest.fn().mockResolvedValue(undefined),
  };

  const emailService = {
    sendUpgradeConfirmationEmail: jest.fn().mockResolvedValue({ success: true }),
  };

  const webhookStore = {
    isProcessed: jest.fn(),
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

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.STRIPE_SECRET_KEY = 'sk_test_real';
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_real';
    delete process.env.STRIPE_FAIL_CLOSED;
    delete process.env.NODE_ENV;

    service = new PaymentsService(
      prisma as never,
      subscriptions as never,
      mail as never,
      emailService as never,
      webhookStore as never,
      alerts as never,
      {
        trackUpgradeCompleted: jest.fn(),
        trackStripeWebhookFailed: jest.fn(),
        trackPaymentCompleted: jest.fn(),
        trackSubscriptionCanceled: jest.fn(),
      } as never
    );
  });

  it('skips already processed events (idempotency)', async () => {
    webhookStore.isProcessed.mockResolvedValue(true);
    await service.processEventWithRetry({
      id: 'evt_123',
      type: 'checkout.session.completed',
      data: { object: {} },
    } as never);
    expect(subscriptions.applyStripeSubscription).not.toHaveBeenCalled();
    expect(webhookStore.markProcessed).not.toHaveBeenCalled();
  });

  it('handles checkout.session.completed and marks processed', async () => {
    webhookStore.isProcessed.mockResolvedValue(false);
    const retrieve = jest.fn().mockResolvedValue({
      id: 'sub_1',
      status: 'active',
      current_period_start: 1_700_000_000,
      current_period_end: 1_700_086_400,
    });
    (service as unknown as { stripe: { subscriptions: { retrieve: typeof retrieve } } }).stripe = {
      subscriptions: { retrieve },
    };

    await service.processEventWithRetry({
      id: 'evt_checkout',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_1',
          client_reference_id: 'user-1',
          metadata: { plan: 'pro' },
          subscription: 'sub_1',
        },
      },
    } as never);

    expect(subscriptions.applyStripeSubscription).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-1', planName: 'pro', stripeSubscriptionId: 'sub_1' })
    );
    expect(webhookStore.markProcessed).toHaveBeenCalledWith('evt_checkout');
  });

  it('retries on transient error then succeeds', async () => {
    webhookStore.isProcessed.mockResolvedValue(false);
    let attempts = 0;
    subscriptions.applyStripeSubscription.mockImplementation(async () => {
      attempts++;
      if (attempts < 2) throw new Error('Network timeout');
    });
    const retrieve = jest.fn().mockResolvedValue({
      id: 'sub_1',
      status: 'active',
      current_period_start: 1_700_000_000,
      current_period_end: 1_700_086_400,
    });
    (service as unknown as { stripe: { subscriptions: { retrieve: typeof retrieve } } }).stripe = {
      subscriptions: { retrieve },
    };

    // Speed up backoff
    jest.spyOn(global, 'setTimeout').mockImplementation((fn: TimerHandler) => {
      if (typeof fn === 'function') fn();
      return 0 as unknown as NodeJS.Timeout;
    });

    await service.processEventWithRetry({
      id: 'evt_retry',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_1',
          metadata: { userId: 'user-1', plan: 'pro' },
          subscription: 'sub_1',
        },
      },
    } as never);

    expect(attempts).toBe(2);
    expect(webhookStore.markProcessed).toHaveBeenCalledWith('evt_retry');
    (global.setTimeout as unknown as jest.Mock).mockRestore?.();
    jest.restoreAllMocks();
  });

  it('sends to DLQ and alerts on permanent error', async () => {
    webhookStore.isProcessed.mockResolvedValue(false);
    subscriptions.applyStripeSubscription.mockRejectedValue(new Error('Permanent'));
    const retrieve = jest.fn().mockResolvedValue({
      id: 'sub_1',
      status: 'active',
      current_period_start: 1_700_000_000,
      current_period_end: 1_700_086_400,
    });
    (service as unknown as { stripe: { subscriptions: { retrieve: typeof retrieve } } }).stripe = {
      subscriptions: { retrieve },
    };

    jest.spyOn(global, 'setTimeout').mockImplementation((fn: TimerHandler) => {
      if (typeof fn === 'function') fn();
      return 0 as unknown as NodeJS.Timeout;
    });

    await expect(
      service.processEventWithRetry({
        id: 'evt_dlq',
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_1',
            metadata: { userId: 'user-1', plan: 'pro' },
            subscription: 'sub_1',
          },
        },
      } as never)
    ).rejects.toThrow('Permanent');

    expect(webhookStore.pushDlq).toHaveBeenCalledWith(
      expect.objectContaining({ eventId: 'evt_dlq', eventType: 'checkout.session.completed' })
    );
    expect(alerts.captureException).toHaveBeenCalled();
    jest.restoreAllMocks();
  });

  it('handles invoice.payment_failed with email alert', async () => {
    webhookStore.isProcessed.mockResolvedValue(false);
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
});

describe('StripeWebhookStoreService helpers', () => {
  it('exports store and alert classes', () => {
    expect(StripeWebhookStoreService).toBeDefined();
    expect(StripeAlertService).toBeDefined();
  });
});

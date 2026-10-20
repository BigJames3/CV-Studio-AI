import { createHmac } from 'crypto';
import {
  BadRequestException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PaymentsService, paystackEventKey, type PaystackEvent } from './payments.service';
import { PaystackApiError, type PaystackTransaction } from './paystack.client';

const SECRET = 'sk_test_webhook_secret';

function sign(body: string, secret = SECRET) {
  return createHmac('sha512', secret).update(Buffer.from(body)).digest('hex');
}

function subscriptionTx(overrides: Partial<PaystackTransaction> = {}): PaystackTransaction {
  return {
    id: 101,
    status: 'success',
    reference: 'sub_ref_1',
    amount: 660_000,
    currency: 'XOF',
    channel: 'mobile_money',
    paid_at: '2026-10-20T10:00:00.000Z',
    customer: { email: 'a@example.com', customer_code: 'CUS_1' },
    metadata: {
      type: 'subscription',
      userId: 'user-1',
      plan: 'pro',
      interval: 'month',
      amount: 660_000,
      currency: 'XOF',
    },
    ...overrides,
  };
}

function chargeSuccess(reference = 'sub_ref_1'): PaystackEvent {
  return { event: 'charge.success', data: { id: 101, reference } };
}

describe('PaymentsService (Paystack)', () => {
  const prisma = {
    subscription: { findUnique: jest.fn() },
    payment: { findMany: jest.fn() },
  };
  const subscriptions = {
    applyPrepaidPayment: jest.fn(),
  };
  const webhookStore = {
    isProcessed: jest.fn(),
    acquireProcessingLock: jest.fn(),
    releaseProcessingLock: jest.fn(),
    markProcessing: jest.fn(),
    markProcessed: jest.fn(),
    incrementAttempts: jest.fn(),
    pushDlq: jest.fn(),
    listDlq: jest.fn(),
    reclaimFromDlq: jest.fn(),
  };
  const alerts = { captureException: jest.fn() };
  const client = { verifyTransaction: jest.fn() };
  const paystack = {
    secretKey: SECRET as string | null,
    require: jest.fn(() => client),
  };
  const marketplace = {
    fulfillTransaction: jest.fn(),
    onRefundProcessed: jest.fn(),
    onChargeDispute: jest.fn(),
  };

  let service: PaymentsService;

  beforeEach(() => {
    jest.clearAllMocks();
    paystack.secretKey = SECRET;
    webhookStore.isProcessed.mockResolvedValue(false);
    webhookStore.acquireProcessingLock.mockResolvedValue(true);
    webhookStore.releaseProcessingLock.mockResolvedValue(undefined);
    webhookStore.markProcessing.mockResolvedValue(true);
    webhookStore.markProcessed.mockResolvedValue(undefined);
    webhookStore.incrementAttempts.mockResolvedValue(1);
    webhookStore.pushDlq.mockResolvedValue(undefined);
    webhookStore.listDlq.mockResolvedValue([]);
    webhookStore.reclaimFromDlq.mockResolvedValue(undefined);
    subscriptions.applyPrepaidPayment.mockResolvedValue({ outcome: 'applied', periodEnd: null });
    client.verifyTransaction.mockResolvedValue(subscriptionTx());
    // Retries back off with setTimeout: run them at once.
    jest.spyOn(global, 'setTimeout').mockImplementation(((fn: () => void) => {
      fn();
      return 0;
    }) as never);
    service = new PaymentsService(
      prisma as never,
      subscriptions as never,
      webhookStore as never,
      alerts as never,
      paystack as never,
      marketplace as never
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('paystackEventKey', () => {
    it('keys on the event and the id of what it is about', () => {
      expect(paystackEventKey({ event: 'charge.success', data: { id: 7, reference: 'r' } })).toBe(
        'charge.success:7'
      );
      expect(paystackEventKey({ event: 'refund.processed', data: { reference: 'r1' } })).toBe(
        'refund.processed:r1'
      );
    });

    it('falls back to a stable hash of the body', () => {
      const event = { event: 'subscription.create', data: { foo: 'bar' } };
      const key = paystackEventKey(event);
      expect(key).toMatch(/^subscription\.create:sha256:[0-9a-f]{64}$/);
      expect(paystackEventKey({ ...event })).toBe(key);
    });
  });

  describe('handlePaystackWebhook', () => {
    it('fails closed when Paystack is not configured', async () => {
      paystack.secretKey = null;
      await expect(service.handlePaystackWebhook(Buffer.from('{}'), 'abc')).rejects.toBeInstanceOf(
        ServiceUnavailableException
      );
      expect(alerts.captureException).toHaveBeenCalled();
    });

    it('rejects a body whose signature does not match', async () => {
      const body = JSON.stringify(chargeSuccess());
      await expect(
        service.handlePaystackWebhook(Buffer.from(body), sign(body, 'sk_test_other'))
      ).rejects.toBeInstanceOf(BadRequestException);
      await expect(
        service.handlePaystackWebhook(Buffer.from(body), 'not-hex')
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(client.verifyTransaction).not.toHaveBeenCalled();
    });

    it('rejects a signed body that is not an event', async () => {
      for (const body of ['not json', JSON.stringify({ data: {} })]) {
        await expect(
          service.handlePaystackWebhook(Buffer.from(body), sign(body))
        ).rejects.toBeInstanceOf(BadRequestException);
      }
    });

    it('verifies the transaction with Paystack and grants the prepaid period', async () => {
      const body = JSON.stringify(chargeSuccess());
      await expect(service.handlePaystackWebhook(Buffer.from(body), sign(body))).resolves.toEqual({
        received: true,
      });
      expect(client.verifyTransaction).toHaveBeenCalledWith('sub_ref_1');
      expect(subscriptions.applyPrepaidPayment).toHaveBeenCalledWith({
        userId: 'user-1',
        plan: 'pro',
        interval: 'month',
        reference: 'sub_ref_1',
        amount: 660_000,
        currency: 'XOF',
        paidAt: new Date('2026-10-20T10:00:00.000Z'),
        customerCode: 'CUS_1',
        channel: 'mobile_money',
      });
      expect(webhookStore.markProcessed).toHaveBeenCalledWith('charge.success:101');
    });
  });

  describe('processEventWithRetry', () => {
    it('skips an event already processed', async () => {
      webhookStore.isProcessed.mockResolvedValue(true);
      await service.processEventWithRetry(chargeSuccess());
      expect(webhookStore.acquireProcessingLock).not.toHaveBeenCalled();
      expect(client.verifyTransaction).not.toHaveBeenCalled();
    });

    it('skips an event another pod is processing', async () => {
      webhookStore.acquireProcessingLock.mockResolvedValue(false);
      await service.processEventWithRetry(chargeSuccess());
      expect(client.verifyTransaction).not.toHaveBeenCalled();
      expect(webhookStore.releaseProcessingLock).not.toHaveBeenCalled();
    });

    it('skips an event processed while waiting for the lock, or not claimed', async () => {
      webhookStore.isProcessed.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
      await service.processEventWithRetry(chargeSuccess());
      webhookStore.markProcessing.mockResolvedValue(false);
      await service.processEventWithRetry(chargeSuccess());
      expect(client.verifyTransaction).not.toHaveBeenCalled();
      expect(webhookStore.releaseProcessingLock).toHaveBeenCalledTimes(2);
    });

    it('retries, then sends the event to the DLQ and alerts', async () => {
      client.verifyTransaction.mockRejectedValue(new PaystackApiError('down', 0));
      await expect(service.processEventWithRetry(chargeSuccess())).rejects.toThrow('down');
      expect(client.verifyTransaction).toHaveBeenCalledTimes(3);
      expect(webhookStore.incrementAttempts).toHaveBeenCalledTimes(3);
      expect(webhookStore.pushDlq).toHaveBeenCalledWith(
        expect.objectContaining({
          eventId: 'charge.success:101',
          eventType: 'charge.success',
          attempts: 3,
          data: chargeSuccess(),
        })
      );
      expect(alerts.captureException).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({ level: 'fatal', retries: 3 })
      );
      expect(webhookStore.markProcessed).not.toHaveBeenCalled();
      expect(webhookStore.releaseProcessingLock).toHaveBeenCalledWith('charge.success:101');
    });

    it('fails a charge.success without reference', async () => {
      await expect(
        service.processEventWithRetry({ event: 'charge.success', data: { id: 5 } })
      ).rejects.toThrow('charge.success without reference');
    });

    it('routes refunds and disputes to the marketplace, ignores other events', async () => {
      const refund = { event: 'refund.processed', data: { id: 9, transaction_reference: 'mkt_1' } };
      await service.processEventWithRetry(refund);
      expect(marketplace.onRefundProcessed).toHaveBeenCalledWith(refund.data);

      const dispute = { event: 'charge.dispute.create', data: { id: 3 } };
      await service.processEventWithRetry(dispute);
      expect(marketplace.onChargeDispute).toHaveBeenCalledWith(
        dispute.data,
        'charge.dispute.create'
      );

      await service.processEventWithRetry({ event: 'transfer.success', data: { id: 4 } });
      expect(webhookStore.markProcessed).toHaveBeenCalledTimes(3);
    });
  });

  describe('fulfillTransaction', () => {
    it('does nothing for a payment that did not succeed', async () => {
      await expect(
        service.fulfillTransaction(subscriptionTx({ status: 'abandoned' }))
      ).resolves.toBe('not_paid');
      expect(subscriptions.applyPrepaidPayment).not.toHaveBeenCalled();
    });

    it('grants nothing when the amount or currency differs from the checkout', async () => {
      await expect(service.fulfillTransaction(subscriptionTx({ amount: 100 }))).resolves.toBe(
        'rejected'
      );
      await expect(service.fulfillTransaction(subscriptionTx({ currency: 'NGN' }))).resolves.toBe(
        'rejected'
      );
      expect(subscriptions.applyPrepaidPayment).not.toHaveBeenCalled();
    });

    it('reads metadata Paystack returns as a JSON string', async () => {
      const tx = subscriptionTx();
      await service.fulfillTransaction({ ...tx, metadata: JSON.stringify(tx.metadata) });
      expect(subscriptions.applyPrepaidPayment).toHaveBeenCalled();
    });

    it('fails on a subscription payment with incomplete metadata', async () => {
      await expect(
        service.fulfillTransaction(
          subscriptionTx({ metadata: { type: 'subscription', userId: 'user-1', plan: 'gold' } })
        )
      ).rejects.toThrow('incomplete metadata');
    });

    it('ignores a payment this app did not create', async () => {
      await expect(service.fulfillTransaction(subscriptionTx({ metadata: null }))).resolves.toBe(
        'ignored'
      );
    });

    it('hands marketplace payments to the marketplace', async () => {
      const tx = subscriptionTx({ metadata: { type: 'marketplace', buyerId: 'user-1' } });
      marketplace.fulfillTransaction.mockResolvedValueOnce({ outcome: 'fulfilled' });
      await expect(service.fulfillTransaction(tx)).resolves.toBe('applied');
      marketplace.fulfillTransaction.mockResolvedValueOnce({ outcome: 'already_fulfilled' });
      await expect(service.fulfillTransaction(tx)).resolves.toBe('already_applied');
      marketplace.fulfillTransaction.mockResolvedValueOnce({ outcome: 'duplicate_payment' });
      await expect(service.fulfillTransaction(tx)).resolves.toBe('duplicate_payment');
    });

    it('fails a marketplace payment when the marketplace is not wired', async () => {
      const bare = new PaymentsService(
        prisma as never,
        subscriptions as never,
        webhookStore as never,
        alerts as never,
        paystack as never
      );
      await expect(
        bare.fulfillTransaction(subscriptionTx({ metadata: { type: 'marketplace' } }))
      ).rejects.toThrow('not wired');
    });
  });

  describe('confirmCheckout', () => {
    it('confirms the caller’s own successful payment', async () => {
      await expect(service.confirmCheckout('user-1', 'sub_ref_1')).resolves.toEqual({
        confirmed: true,
      });
      subscriptions.applyPrepaidPayment.mockResolvedValueOnce({ outcome: 'already_applied' });
      await expect(service.confirmCheckout('user-1', 'sub_ref_1')).resolves.toEqual({
        confirmed: true,
      });
    });

    it('reports a payment that is not complete yet', async () => {
      client.verifyTransaction.mockResolvedValue(subscriptionTx({ status: 'ongoing' }));
      await expect(service.confirmCheckout('user-1', 'sub_ref_1')).resolves.toEqual({
        confirmed: false,
      });
    });

    it('hides another user’s payment', async () => {
      await expect(service.confirmCheckout('user-2', 'sub_ref_1')).rejects.toBeInstanceOf(
        NotFoundException
      );
      client.verifyTransaction.mockResolvedValue(
        subscriptionTx({ metadata: { type: 'marketplace', buyerId: 'user-2' } })
      );
      await expect(service.confirmCheckout('user-1', 'sub_ref_1')).rejects.toBeInstanceOf(
        NotFoundException
      );
      expect(subscriptions.applyPrepaidPayment).not.toHaveBeenCalled();
    });

    it('maps Paystack errors', async () => {
      client.verifyTransaction.mockRejectedValueOnce(new PaystackApiError('not found', 404));
      await expect(service.confirmCheckout('user-1', 'sub_ref_x')).rejects.toBeInstanceOf(
        NotFoundException
      );
      client.verifyTransaction.mockRejectedValueOnce(new PaystackApiError('down', 0));
      await expect(service.confirmCheckout('user-1', 'sub_ref_x')).rejects.toBeInstanceOf(
        ServiceUnavailableException
      );
      paystack.require.mockImplementationOnce(() => {
        throw new ServiceUnavailableException({ code: 'PAYMENTS_NOT_CONFIGURED' });
      });
      await expect(service.confirmCheckout('user-1', 'sub_ref_x')).rejects.toBeInstanceOf(
        ServiceUnavailableException
      );
    });
  });

  describe('DLQ replay', () => {
    const row = {
      id: 'charge.success:101',
      type: 'charge.success',
      attempts: 3,
      lastError: 'down',
      payload: chargeSuccess(),
      createdAt: new Date(),
    };

    it('replays a stored event', async () => {
      webhookStore.listDlq.mockResolvedValue([row]);
      await expect(service.retryDlqEvent(row.id)).resolves.toEqual({ ok: true });
      expect(webhookStore.reclaimFromDlq).toHaveBeenCalledWith(row.id);
      expect(client.verifyTransaction).toHaveBeenCalledWith('sub_ref_1');
      expect(webhookStore.markProcessed).toHaveBeenCalledWith(row.id);
    });

    it('puts a failed replay back in the DLQ', async () => {
      webhookStore.listDlq.mockResolvedValue([row]);
      client.verifyTransaction.mockRejectedValue(new Error('still down'));
      await expect(service.retryDlqEvent(row.id)).resolves.toEqual({
        ok: false,
        error: 'still down',
      });
      expect(webhookStore.pushDlq).toHaveBeenCalledWith(
        expect.objectContaining({ eventId: row.id, attempts: 4 })
      );
    });

    it('reports an unknown event and counts a batch', async () => {
      await expect(service.retryDlqEvent('missing')).resolves.toEqual({
        ok: false,
        error: 'not_found',
      });
      // A row without payload cannot be replayed: it stays in the DLQ.
      webhookStore.listDlq.mockResolvedValue([row, { ...row, id: 'other', payload: null }]);
      await expect(service.retryAllDlq()).resolves.toEqual({
        retried: 2,
        succeeded: 1,
        failed: 1,
      });
    });
  });

  describe('history', () => {
    it('lists the payments of the user’s subscription', async () => {
      prisma.subscription.findUnique.mockResolvedValueOnce(null);
      await expect(service.history('user-1')).resolves.toEqual({ items: [] });
      prisma.subscription.findUnique.mockResolvedValueOnce({ id: 'sub-1' });
      prisma.payment.findMany.mockResolvedValueOnce([{ id: 'p1' }]);
      await expect(service.history('user-1')).resolves.toEqual({ items: [{ id: 'p1' }] });
      expect(prisma.payment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { subscriptionId: 'sub-1' } })
      );
    });
  });
});

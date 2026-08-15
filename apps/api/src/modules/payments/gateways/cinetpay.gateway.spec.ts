import { BadRequestException } from '@nestjs/common';
import { CinetpayGateway } from './cinetpay.gateway';

const USER_ID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
const SUB_ID = 'sub-1';
const TX = 'cv_abc123_123';

function jsonResponse(body: unknown, ok = true, status = 200) {
  return {
    ok,
    status,
    json: async () => body,
  };
}

describe('CinetpayGateway', () => {
  const prisma = {
    user: { findFirst: jest.fn(), update: jest.fn() },
    subscription: { findUnique: jest.fn(), update: jest.fn() },
    payment: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
  };

  const env: Record<string, string> = {
    CINETPAY_API_KEY: 'test_api_key',
    CINETPAY_SITE_ID: 'test_site_id',
    APP_URL: 'http://localhost:3000',
    API_URL: 'http://localhost:3001',
  };

  const config = {
    get: jest.fn((key: string): string | undefined => env[key]),
  };

  const subscriptions = {
    applyPaidEntitlement: jest.fn().mockResolvedValue({}),
  };

  let gateway: CinetpayGateway;
  let fetchMock: jest.Mock;
  const originalFetch = global.fetch;

  const pendingPayment = {
    id: 'pay-1',
    transactionId: TX,
    status: 'pending',
    subscriptionId: SUB_ID,
    metadata: { plan: 'pro', interval: 'month', userId: USER_ID },
    subscription: {
      id: SUB_ID,
      userId: USER_ID,
      currentPeriodEnd: new Date('2020-01-01'),
      plan: { name: 'Pro' },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    env.CINETPAY_API_KEY = 'test_api_key';
    env.CINETPAY_SITE_ID = 'test_site_id';
    config.get.mockImplementation((key: string) => env[key]);

    prisma.user.findFirst.mockResolvedValue({
      id: USER_ID,
      email: 'user@example.com',
      firstName: 'Ada',
      lastName: 'Lovelace',
      phone: null,
      location: null,
      deletedAt: null,
    });
    prisma.subscription.findUnique.mockResolvedValue({
      id: SUB_ID,
      userId: USER_ID,
      plan: { name: 'Pro', priceMonthly: 9.99, priceYearly: 99 },
    });
    prisma.subscription.update.mockResolvedValue({});
    prisma.user.update.mockResolvedValue({});
    prisma.payment.create.mockResolvedValue({ id: 'pay-1', transactionId: TX, status: 'pending' });
    prisma.payment.update.mockResolvedValue({});
    prisma.payment.updateMany.mockResolvedValue({ count: 1 });
    prisma.payment.findUnique.mockResolvedValue(pendingPayment);

    subscriptions.applyPaidEntitlement.mockResolvedValue({});
    gateway = new CinetpayGateway(prisma as never, config as never, subscriptions as never);
    fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('createPayment', () => {
    it('should create pending payment and return checkout URL', async () => {
      fetchMock.mockResolvedValue(
        jsonResponse({
          code: '201',
          message: 'CREATED',
          data: { payment_url: 'https://checkout.cinetpay.com/payment/tok_test' },
        })
      );

      const result = await gateway.createPayment(USER_ID, {
        plan: 'pro',
        interval: 'month',
        subscriptionId: SUB_ID,
      });

      expect(result.url).toMatch(/checkout.cinetpay.com/);
      expect(result.transactionId).toMatch(/^cv_/);
      expect(result.paymentMethod).toBe('cinetpay');
      expect(prisma.payment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'pending',
            paymentMethod: 'cinetpay',
            currency: 'XOF',
            subscriptionId: SUB_ID,
          }),
        })
      );
      expect(fetchMock).toHaveBeenCalledWith(
        'https://api-checkout.cinetpay.com/v2/payment',
        expect.objectContaining({ method: 'POST' })
      );
    });

    it('should fail if env vars not set', async () => {
      config.get.mockImplementation(() => undefined);

      await expect(
        gateway.createPayment(USER_ID, { plan: 'pro', interval: 'month', subscriptionId: SUB_ID })
      ).rejects.toMatchObject({
        response: expect.objectContaining({ code: 'CINETPAY_NOT_CONFIGURED' }),
      });
      expect(prisma.payment.create).not.toHaveBeenCalled();
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('should mark payment failed when CinetPay API returns HTTP 500', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ message: 'upstream' }, false, 500));

      await expect(
        gateway.createPayment(USER_ID, { plan: 'pro', interval: 'month', subscriptionId: SUB_ID })
      ).rejects.toMatchObject({
        response: expect.objectContaining({ code: 'CINETPAY_API_ERROR' }),
      });

      expect(prisma.payment.create).toHaveBeenCalled();
      expect(prisma.payment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'failed' }),
        })
      );
    });

    it('should persist a pending Payment before calling CinetPay', async () => {
      const callOrder: string[] = [];
      prisma.payment.create.mockImplementation(async () => {
        callOrder.push('create');
        return { id: 'pay-1', transactionId: TX, status: 'pending' };
      });
      fetchMock.mockImplementation(async () => {
        callOrder.push('fetch');
        return jsonResponse({
          code: '201',
          data: { payment_url: 'https://checkout.cinetpay.com/payment/tok_test' },
        });
      });

      await gateway.createPayment(USER_ID, {
        plan: 'pro',
        interval: 'month',
        subscriptionId: SUB_ID,
      });

      expect(callOrder).toEqual(['create', 'fetch']);
    });
  });

  describe('handleCinetpayNotify', () => {
    it('should return 200 on GET (health ping)', async () => {
      const result = await gateway.handleCinetpayNotify({}, 'GET');
      expect(result).toEqual({ received: true });
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('should return 200 when transaction id is missing', async () => {
      const result = await gateway.handleCinetpayNotify({}, 'POST');
      expect(result).toEqual({ received: true });
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('should handle ACCEPTED notification after /payment/check', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ data: { status: 'ACCEPTED' } }));

      const result = await gateway.handleCinetpayNotify({ cpm_trans_id: TX }, 'POST');

      expect(result).toEqual({ received: true });
      expect(fetchMock).toHaveBeenCalledWith(
        'https://api-checkout.cinetpay.com/v2/payment/check',
        expect.anything()
      );
      expect(subscriptions.applyPaidEntitlement).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: USER_ID,
          plan: 'pro',
          provider: 'cinetpay',
          status: 'active',
          cinetpayTransactionId: TX,
        })
      );
      expect(prisma.payment.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: { in: ['pending', 'failed'] },
          }),
          data: { status: 'completed', failedReason: null },
        })
      );
    });

    it('should handle REFUSED notification', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ data: { status: 'REFUSED' } }));

      const result = await gateway.handleCinetpayNotify(
        { cpm_trans_id: TX, cpm_error_message: 'Declined' },
        'POST'
      );

      expect(result).toEqual({ received: true });
      expect(prisma.payment.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'failed',
            failedReason: 'Declined',
          }),
        })
      );
      expect(prisma.subscription.update).not.toHaveBeenCalled();
      expect(subscriptions.applyPaidEntitlement).not.toHaveBeenCalled();
    });

    it('should be idempotent (duplicate notify does not double-grant)', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ data: { status: 'ACCEPTED' } }));
      prisma.payment.findUnique
        .mockResolvedValueOnce(pendingPayment)
        .mockResolvedValueOnce({ ...pendingPayment, status: 'completed' });

      await gateway.handleCinetpayNotify({ cpm_trans_id: TX }, 'POST');
      await gateway.handleCinetpayNotify({ cpm_trans_id: TX }, 'POST');

      expect(subscriptions.applyPaidEntitlement).toHaveBeenCalledTimes(1);
    });

    it('should take no action on WAITING', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ data: { status: 'WAITING' } }));

      const result = await gateway.handleCinetpayNotify({ cpm_trans_id: TX }, 'POST');

      expect(result).toEqual({ received: true });
      expect(subscriptions.applyPaidEntitlement).not.toHaveBeenCalled();
      expect(prisma.payment.updateMany).not.toHaveBeenCalled();
      expect(prisma.payment.update).not.toHaveBeenCalled();
    });

    it('should return 200 for unknown transactionId (fail-closed)', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ data: { status: 'ACCEPTED' } }));
      prisma.payment.findUnique.mockResolvedValue(null);

      const result = await gateway.handleCinetpayNotify({ cpm_trans_id: 'cv_unknown' }, 'POST');

      expect(result).toEqual({ received: true });
      expect(subscriptions.applyPaidEntitlement).not.toHaveBeenCalled();
    });

    it('should still return received=true if /payment/check fails', async () => {
      fetchMock.mockResolvedValue(jsonResponse({}, false, 500));

      const result = await gateway.handleCinetpayNotify({ cpm_trans_id: TX }, 'POST');
      expect(result).toEqual({ received: true });
      expect(subscriptions.applyPaidEntitlement).not.toHaveBeenCalled();
    });
  });

  describe('getPaymentStatus', () => {
    it('should return payment status for polling', async () => {
      const result = await gateway.getPaymentStatus(TX);
      expect(result).toMatchObject({
        status: 'pending',
        paymentMethod: 'cinetpay',
        transactionId: TX,
      });
    });

    it('should hide payments owned by another user', async () => {
      const result = await gateway.getPaymentStatus(TX, 'other-user');
      expect(result).toEqual({ status: 'not_found' });
    });

    it('should return not_found for unknown transaction', async () => {
      prisma.payment.findUnique.mockResolvedValue(null);
      await expect(gateway.getPaymentStatus('cv_missing')).resolves.toEqual({
        status: 'not_found',
      });
    });
  });

  describe('checkCinetpayStatus', () => {
    it.each([
      ['ACCEPTED', 'ACCEPTED'],
      ['REFUSED', 'REFUSED'],
      ['WAITING', 'WAITING'],
      ['PENDING', 'WAITING'],
    ] as const)('maps CinetPay status %s → %s', async (apiStatus, expected) => {
      fetchMock.mockResolvedValue(jsonResponse({ data: { status: apiStatus } }));
      await expect(gateway.checkCinetpayStatus(TX)).resolves.toEqual({ status: expected });
    });

    it('should throw on HTTP 500 (after retry)', async () => {
      fetchMock.mockResolvedValue(jsonResponse({}, false, 500));
      await expect(gateway.checkCinetpayStatus(TX)).rejects.toThrow(/CinetPay check error: 500/);
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('retries once then returns ACCEPTED', async () => {
      fetchMock
        .mockResolvedValueOnce(jsonResponse({}, false, 500))
        .mockResolvedValueOnce(jsonResponse({ data: { status: 'ACCEPTED' } }));

      await expect(gateway.checkCinetpayStatus(TX)).resolves.toEqual({ status: 'ACCEPTED' });
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('should throw after retry when the check times out', async () => {
      const abort = Object.assign(new Error('The operation was aborted'), { name: 'AbortError' });
      fetchMock.mockRejectedValue(abort);
      await expect(gateway.checkCinetpayStatus(TX)).rejects.toMatchObject({ name: 'AbortError' });
      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(fetchMock).toHaveBeenCalledWith(
        'https://api-checkout.cinetpay.com/v2/payment/check',
        expect.objectContaining({ signal: expect.any(AbortSignal) })
      );
    });
  });
});

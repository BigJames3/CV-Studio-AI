import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { SubscriptionsService, type PrepaidPayment } from './subscriptions.service';
import { CheckoutDto } from './dto/subscription.dto';

const PLANS = {
  Free: { id: 'plan-free', name: 'Free', priceMonthly: 0, priceYearly: 0 },
  Pro: { id: 'plan-pro', name: 'Pro', priceMonthly: 9.99, priceYearly: 99 },
  Business: { id: 'plan-business', name: 'Business', priceMonthly: 29.99, priceYearly: 299 },
} as const;

function makePrisma() {
  const prisma = {
    plan: {
      findUnique: jest.fn(({ where }: { where: { name: keyof typeof PLANS } }) =>
        Promise.resolve(PLANS[where.name] ?? null)
      ),
      findMany: jest.fn().mockResolvedValue([PLANS.Pro, PLANS.Business]),
    },
    subscription: {
      findUnique: jest.fn().mockResolvedValue(null),
      upsert: jest.fn().mockResolvedValue({ id: 'sub-1' }),
      update: jest.fn().mockResolvedValue({}),
    },
    payment: {
      findUnique: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({}),
    },
    invoice: { create: jest.fn().mockResolvedValue({}) },
    user: {
      findFirst: jest.fn().mockResolvedValue({ id: 'user-1', email: 'a@example.com' }),
      update: jest.fn().mockResolvedValue({}),
    },
    $executeRaw: jest.fn().mockResolvedValue(1),
    $transaction: jest.fn(),
  };
  prisma.$transaction.mockImplementation((fn: (tx: typeof prisma) => unknown) => fn(prisma));
  return prisma;
}

describe('SubscriptionsService', () => {
  const env = { ...process.env };
  let prisma: ReturnType<typeof makePrisma>;
  const entitlements = { snapshot: jest.fn() };
  const client = { initializeTransaction: jest.fn() };
  const paystack = { require: jest.fn(() => client) };
  let service: SubscriptionsService;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...env, APP_URL: 'https://app.example.com', PAYSTACK_SECRET_KEY: 'sk_test_k' };
    delete process.env.PAYMENT_CURRENCY;
    delete process.env.PAYSTACK_ALLOW_LIVE;
    prisma = makePrisma();
    client.initializeTransaction.mockResolvedValue({
      authorization_url: 'https://checkout.paystack.com/abc',
      reference: 'ignored',
    });
    service = new SubscriptionsService(prisma as never, entitlements as never, paystack as never);
  });

  afterAll(() => {
    process.env = env;
  });

  describe('checkout', () => {
    it('opens a Paystack page for one prepaid period, in XOF', async () => {
      const result = await service.checkout('user-1', { plan: 'pro', interval: 'month' });

      expect(result).toMatchObject({
        url: 'https://checkout.paystack.com/abc',
        plan: 'pro',
        interval: 'month',
        amount: 6600_00,
        currency: 'XOF',
      });
      expect(result.reference).toMatch(/^sub_[0-9a-f]{32}$/);
      expect(client.initializeTransaction).toHaveBeenCalledWith({
        email: 'a@example.com',
        amount: 6600_00,
        currency: 'XOF',
        reference: result.reference,
        callback_url: 'https://app.example.com/account/billing?checkout=success',
        metadata: {
          type: 'subscription',
          userId: 'user-1',
          plan: 'pro',
          interval: 'month',
          amount: 6600_00,
          currency: 'XOF',
          cancel_action: 'https://app.example.com/account/billing?checkout=cancel',
        },
      });
      // Nothing is granted before Paystack confirms the payment.
      expect(prisma.subscription.upsert).not.toHaveBeenCalled();
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('charges the yearly price and keeps only same-origin billing return URLs', async () => {
      await service.checkout('user-1', {
        plan: 'business',
        interval: 'year',
        successUrl: 'https://app.example.com/account/billing?checkout=success&x=1',
        cancelUrl: 'https://evil.example.net/account/billing',
      });
      const params = client.initializeTransaction.mock.calls[0][0];
      expect(params.amount).toBe(196200_00);
      expect(params.callback_url).toBe(
        'https://app.example.com/account/billing?checkout=success&x=1'
      );
      expect(params.metadata.cancel_action).toBe(
        'https://app.example.com/account/billing?checkout=cancel'
      );
    });

    it('refuses unknown users and plans', async () => {
      prisma.user.findFirst.mockResolvedValueOnce(null);
      await expect(
        service.checkout('user-x', { plan: 'pro', interval: 'month' })
      ).rejects.toBeInstanceOf(NotFoundException);
      prisma.plan.findUnique.mockResolvedValueOnce(null as never);
      await expect(
        service.checkout('user-1', { plan: 'pro', interval: 'month' })
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('blocks live Paystack keys unless PAYSTACK_ALLOW_LIVE=1', async () => {
      process.env.PAYSTACK_SECRET_KEY = 'sk_live_k';
      await expect(
        service.checkout('user-1', { plan: 'pro', interval: 'month' })
      ).rejects.toMatchObject({ response: { code: 'PAYSTACK_LIVE_KEY_BLOCKED' } });
      expect(client.initializeTransaction).not.toHaveBeenCalled();
    });

    it('fails closed without Paystack, without a price, or when Paystack fails', async () => {
      paystack.require.mockImplementationOnce(() => {
        throw new ServiceUnavailableException({ code: 'PAYMENTS_NOT_CONFIGURED' });
      });
      await expect(
        service.checkout('user-1', { plan: 'pro', interval: 'month' })
      ).rejects.toBeInstanceOf(ServiceUnavailableException);

      process.env.PAYMENT_CURRENCY = 'GHS';
      await expect(
        service.checkout('user-1', { plan: 'pro', interval: 'month' })
      ).rejects.toMatchObject({ response: { code: 'PRICE_NOT_CONFIGURED' } });
      delete process.env.PAYMENT_CURRENCY;

      client.initializeTransaction.mockRejectedValueOnce(new Error('down'));
      await expect(
        service.checkout('user-1', { plan: 'pro', interval: 'month' })
      ).rejects.toMatchObject({ response: { code: 'PAYMENT_PROVIDER_UNAVAILABLE' } });
      expect(prisma.subscription.upsert).not.toHaveBeenCalled();
    });

    it('validates the checkout DTO', async () => {
      const ok = plainToInstance(CheckoutDto, { plan: 'pro', interval: 'year' });
      expect(await validate(ok)).toHaveLength(0);
      for (const bad of [
        { plan: 'gold', interval: 'month' },
        { plan: 'pro', interval: 'week' },
      ]) {
        expect(await validate(plainToInstance(CheckoutDto, bad))).not.toHaveLength(0);
      }
    });
  });

  describe('applyPrepaidPayment', () => {
    const payment: PrepaidPayment = {
      userId: 'user-1',
      plan: 'pro',
      interval: 'month',
      reference: 'sub_ref_1',
      amount: 6600_00,
      currency: 'XOF',
      paidAt: new Date('2026-10-20T10:00:00Z'),
      customerCode: 'CUS_1',
      channel: 'mobile_money',
    };

    it('grants one month from the payment, records the payment and an invoice', async () => {
      await expect(service.applyPrepaidPayment(payment)).resolves.toEqual({
        outcome: 'applied',
        periodEnd: new Date('2026-11-20T10:00:00Z'),
      });

      expect(prisma.$executeRaw).toHaveBeenCalled(); // per-user billing lock
      expect(prisma.subscription.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({
            planId: 'plan-pro',
            status: 'active',
            provider: 'paystack',
            currentPeriodStart: payment.paidAt,
            currentPeriodEnd: new Date('2026-11-20T10:00:00Z'),
            cancelAtPeriodEnd: false,
            renewalReminderSentAt: null,
            paystackCustomerCode: 'CUS_1',
          }),
        })
      );
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: {
          subscriptionTier: 'pro',
          subscriptionStartDate: payment.paidAt,
          subscriptionEndDate: new Date('2026-11-20T10:00:00Z'),
        },
      });
      expect(prisma.payment.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          subscriptionId: 'sub-1',
          amount: 6600,
          currency: 'XOF',
          status: 'completed',
          paymentMethod: 'paystack',
          transactionId: 'sub_ref_1',
        }),
      });
      expect(prisma.invoice.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          invoiceNumber: 'PSK-sub_ref_1',
          amount: 6600,
          status: 'paid',
        }),
      });
    });

    it('extends an active period of the same plan from its end', async () => {
      prisma.subscription.findUnique.mockResolvedValueOnce({
        status: 'active',
        currentPeriodStart: new Date('2026-10-01T00:00:00Z'),
        currentPeriodEnd: new Date('2026-11-01T00:00:00Z'),
        plan: { name: 'Pro' },
      });
      await expect(service.applyPrepaidPayment(payment)).resolves.toMatchObject({
        periodEnd: new Date('2026-12-01T00:00:00Z'),
      });
    });

    it('is idempotent on the Paystack reference', async () => {
      prisma.payment.findUnique.mockResolvedValueOnce({ id: 'pay-1' });
      await expect(service.applyPrepaidPayment(payment)).resolves.toEqual({
        outcome: 'already_applied',
        periodEnd: null,
      });
      expect(prisma.subscription.upsert).not.toHaveBeenCalled();

      prisma.$transaction.mockRejectedValueOnce(
        new Prisma.PrismaClientKnownRequestError('dup', { code: 'P2002', clientVersion: 'x' })
      );
      await expect(service.applyPrepaidPayment(payment)).resolves.toMatchObject({
        outcome: 'already_applied',
      });
    });

    it('fails for an unknown user and rethrows other errors', async () => {
      prisma.user.findFirst.mockResolvedValueOnce(null);
      await expect(service.applyPrepaidPayment(payment)).rejects.toThrow('unknown user');
      prisma.$transaction.mockRejectedValueOnce(new Error('db down'));
      await expect(service.applyPrepaidPayment(payment)).rejects.toThrow('db down');
    });

    it('uses the catalog fallback prices when the plans table has none', async () => {
      prisma.plan.findMany.mockResolvedValueOnce([]);
      prisma.subscription.findUnique.mockResolvedValueOnce({
        status: 'active',
        currentPeriodStart: new Date('2026-10-01T00:00:00Z'),
        currentPeriodEnd: new Date('2026-11-19T10:00:00Z'),
        plan: { name: 'Business' },
      });
      // 30 days of Business (29.99) are worth 90 days of Pro (9.99).
      const result = await service.applyPrepaidPayment(payment);
      expect(result.periodEnd).toEqual(new Date('2027-02-18T10:00:00Z'));
    });
  });

  describe('applyPaidEntitlement', () => {
    const base = {
      userId: 'user-1',
      provider: 'paystack' as const,
      periodStart: new Date('2026-01-01'),
      periodEnd: new Date('2026-02-01'),
    };

    it('fails on an unknown plan or a missing plan row (never coerces to free)', async () => {
      await expect(service.applyPaidEntitlement({ ...base, plan: 'gold' })).rejects.toThrow(
        /Unknown plan/
      );
      prisma.plan.findUnique.mockResolvedValueOnce(null as never);
      await expect(service.applyPaidEntitlement({ ...base, plan: 'pro' })).rejects.toThrow(
        /Unknown plan/
      );
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('drops access for canceled or unknown statuses', async () => {
      await service.applyPaidEntitlement({ ...base, plan: 'business', status: 'canceled' });
      expect(prisma.user.update).toHaveBeenLastCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ subscriptionTier: 'free' }) })
      );
      await service.applyPaidEntitlement({ ...base, plan: 'business', status: 'weird' });
      expect(prisma.subscription.upsert).toHaveBeenLastCalledWith(
        expect.objectContaining({ update: expect.objectContaining({ status: 'suspended' }) })
      );
    });

    it('records a scheduled end with its date', async () => {
      const canceledAt = new Date('2026-01-15');
      await service.applyPaidEntitlement({
        ...base,
        plan: 'business',
        cancelAtPeriodEnd: true,
        canceledAt,
      });
      expect(prisma.subscription.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({ cancelAtPeriodEnd: true, canceledAt }),
        })
      );
    });
  });

  describe('me / cancel / cancelImmediately / create', () => {
    it('never offers a trial', async () => {
      entitlements.snapshot.mockResolvedValue({
        tier: 'free',
        entitlements: [],
        cvCount: 0,
        cvLimit: 1,
        cvRemaining: 1,
      });
      prisma.user.findFirst.mockResolvedValueOnce({ trialEndsAt: null });
      await expect(service.me('user-1')).resolves.toMatchObject({ trialEligible: false });
    });

    it('records the intent not to renew', async () => {
      await expect(service.cancel('user-x')).rejects.toBeInstanceOf(NotFoundException);
      prisma.subscription.findUnique.mockResolvedValueOnce({ id: 'sub-1' });
      await service.cancel('user-1');
      expect(prisma.subscription.update).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        data: { cancelAtPeriodEnd: true, canceledAt: expect.any(Date) },
      });
    });

    it('ends paid access at once for account erasure', async () => {
      await expect(service.cancelImmediately('user-1')).resolves.toEqual({
        hadSubscription: false,
      });
      prisma.subscription.findUnique.mockResolvedValueOnce({ id: 'sub-1' });
      await expect(service.cancelImmediately('user-1')).resolves.toEqual({
        hadSubscription: true,
      });
      expect(prisma.subscription.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'canceled' }) })
      );
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ subscriptionTier: 'free' }) })
      );
    });

    it('create (internal) needs an existing plan', async () => {
      prisma.plan.findUnique.mockResolvedValueOnce(null as never);
      await expect(service.create('user-1', { plan: 'pro' })).rejects.toBeInstanceOf(
        NotFoundException
      );
      await service.create('user-1', { plan: 'free' });
      expect(prisma.subscription.upsert).toHaveBeenCalled();
    });
  });
});

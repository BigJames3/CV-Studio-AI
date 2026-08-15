import { validate } from 'class-validator';
import { suggestPaymentMethod } from '@cvstudio/shared-utils';
import { SubscriptionsService } from './subscriptions.service';
import { CheckoutDto } from './dto/subscription.dto';

describe('SubscriptionsService.applyStripeSubscription', () => {
  const prisma = {
    plan: { findUnique: jest.fn() },
    subscription: { upsert: jest.fn() },
    user: { findFirst: jest.fn(), update: jest.fn() },
  };

  const entitlements = {};
  let service: SubscriptionsService;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.plan.findUnique.mockResolvedValue({ id: 'plan-pro', name: 'Pro' });
    prisma.subscription.upsert.mockResolvedValue({});
    prisma.user.update.mockResolvedValue({});
    service = new SubscriptionsService(prisma as never, entitlements as never);
  });

  const base = {
    userId: 'user-1',
    planName: 'pro',
    stripeSubscriptionId: 'sub_1',
    currentPeriodStart: new Date('2026-01-01'),
    currentPeriodEnd: new Date('2026-02-01'),
  };

  it('P0-2 throws when DB plan is missing instead of silent no-op', async () => {
    prisma.plan.findUnique.mockResolvedValue(null);
    await expect(service.applyStripeSubscription({ ...base, status: 'active' })).rejects.toThrow(
      /Unknown plan/
    );
    expect(prisma.subscription.upsert).not.toHaveBeenCalled();
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('P0-2 throws on unrecognized plan name (does not coerce to free)', async () => {
    await expect(
      service.applyStripeSubscription({ ...base, planName: 'gold', status: 'active' })
    ).rejects.toThrow(/Unknown plan/);
  });

  it('P0-3 persists cancelAtPeriodEnd=true while keeping status active', async () => {
    await service.applyStripeSubscription({
      ...base,
      status: 'active',
      cancelAtPeriodEnd: true,
    });

    expect(prisma.subscription.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({
          status: 'active',
          cancelAtPeriodEnd: true,
        }),
        create: expect.objectContaining({
          cancelAtPeriodEnd: true,
        }),
      })
    );
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ subscriptionTier: 'pro' }),
      })
    );
  });

  it('P0-3 persists cancelAtPeriodEnd=false on reactivation', async () => {
    await service.applyStripeSubscription({
      ...base,
      status: 'active',
      cancelAtPeriodEnd: false,
    });

    expect(prisma.subscription.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({ cancelAtPeriodEnd: false, canceledAt: null }),
      })
    );
  });

  it('keeps Stripe behavior: provider=stripe and stripeSubscriptionId', async () => {
    await service.applyStripeSubscription({ ...base, status: 'active' });

    expect(prisma.subscription.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          provider: 'stripe',
          stripeSubscriptionId: 'sub_1',
        }),
        update: expect.objectContaining({
          provider: 'stripe',
          stripeSubscriptionId: 'sub_1',
        }),
      })
    );
  });
});

describe('SubscriptionsService.applyPaidEntitlement', () => {
  const userId = 'user-1';
  const future = new Date('2027-01-01');
  const prisma = {
    plan: { findUnique: jest.fn() },
    subscription: { upsert: jest.fn() },
    user: { update: jest.fn() },
  };
  const entitlements = {};
  let service: SubscriptionsService;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.plan.findUnique.mockImplementation(async (args: { where: { name: string } }) => {
      const name = args.where.name;
      if (name === 'Pro') return { id: 'plan-pro', name: 'Pro' };
      if (name === 'Business') return { id: 'plan-biz', name: 'Business' };
      if (name === 'Free') return { id: 'plan-free', name: 'Free' };
      return null;
    });
    prisma.subscription.upsert.mockImplementation(
      async (args: { create: Record<string, unknown>; update: Record<string, unknown> }) => ({
        id: 'sub-1',
        userId,
        ...args.create,
        ...args.update,
      })
    );
    prisma.user.update.mockResolvedValue({});
    service = new SubscriptionsService(prisma as never, entitlements as never);
  });

  it('should grant pro tier via stripe', async () => {
    const result = await service.applyPaidEntitlement({
      userId,
      plan: 'pro',
      provider: 'stripe',
      periodEnd: future,
      stripeSubscriptionId: 'sub_123',
    });

    expect(result).toMatchObject({ provider: 'stripe', status: 'active' });
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ subscriptionTier: 'pro', subscriptionEndDate: future }),
      })
    );
  });

  it('should grant pro tier via cinetpay', async () => {
    const result = await service.applyPaidEntitlement({
      userId,
      plan: 'pro',
      provider: 'cinetpay',
      periodEnd: future,
      cinetpayTransactionId: 'cv_abc_123',
    });

    expect(result).toMatchObject({
      provider: 'cinetpay',
      cinetpayTransactionId: 'cv_abc_123',
    });
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ subscriptionTier: 'pro' }),
      })
    );
  });

  it('should upgrade from pro to business', async () => {
    await service.applyPaidEntitlement({
      userId,
      plan: 'pro',
      provider: 'stripe',
      periodEnd: future,
      stripeSubscriptionId: 'sub_123',
    });

    const result = await service.applyPaidEntitlement({
      userId,
      plan: 'business',
      provider: 'stripe',
      periodEnd: future,
      stripeSubscriptionId: 'sub_456',
    });

    expect(result.planId).toBe('plan-biz');
    expect(prisma.user.update).toHaveBeenLastCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ subscriptionTier: 'business' }),
      })
    );
  });

  it('should clear lastPaymentError on success', async () => {
    await service.applyPaidEntitlement({
      userId,
      plan: 'pro',
      provider: 'cinetpay',
      periodEnd: future,
      cinetpayTransactionId: 'cv_ok_123',
    });

    expect(prisma.subscription.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({ lastPaymentError: null, provider: 'cinetpay' }),
        create: expect.objectContaining({
          currentPeriodEnd: future,
          lastPaymentError: null,
        }),
      })
    );
  });

  it('should persist currentPeriodEnd on create and update', async () => {
    await service.applyPaidEntitlement({
      userId,
      plan: 'pro',
      provider: 'cinetpay',
      periodEnd: future,
      cinetpayTransactionId: 'cv_period_1',
    });

    expect(prisma.subscription.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ currentPeriodEnd: future, provider: 'cinetpay' }),
        update: expect.objectContaining({ currentPeriodEnd: future, provider: 'cinetpay' }),
      })
    );
  });
});

describe('SubscriptionsService.checkout', () => {
  const userId = 'user-1';
  const prisma = {
    plan: { findUnique: jest.fn() },
    subscription: { upsert: jest.fn() },
    user: { findFirst: jest.fn(), update: jest.fn() },
  };
  const entitlements = {};
  let service: SubscriptionsService;
  let createCheckoutSession: jest.Mock;
  const cinetpayGateway = {
    createPayment: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.user.findFirst.mockResolvedValue({
      id: userId,
      email: 'user@example.com',
      deletedAt: null,
    });
    prisma.plan.findUnique.mockResolvedValue({
      id: 'plan-pro',
      name: 'Pro',
      priceMonthly: 9.99,
      priceYearly: 99,
      description: 'Pro plan',
    });
    prisma.user.update.mockResolvedValue({});
    prisma.subscription.upsert.mockResolvedValue({ id: 'sub-1', userId });
    cinetpayGateway.createPayment.mockResolvedValue({
      url: 'https://checkout.cinetpay.com/payment/tok_test',
      transactionId: 'cv_user1_1',
      paymentMethod: 'cinetpay',
      plan: 'pro',
      interval: 'month',
    });
    service = new SubscriptionsService(
      prisma as never,
      entitlements as never,
      cinetpayGateway as never
    );
    createCheckoutSession = jest.fn().mockResolvedValue({
      id: 'cs_test_123',
      url: 'https://checkout.stripe.com/c/pay/cs_test_123',
    });
    (service as unknown as { stripe: unknown }).stripe = {
      checkout: { sessions: { create: createCheckoutSession } },
    };
  });

  describe('paymentMethod routing', () => {
    it('should default to stripe if paymentMethod not provided', async () => {
      const dto: CheckoutDto = { plan: 'pro', interval: 'month' };
      const result = await service.checkout(userId, dto);
      expect(result.url).toMatch(/checkout.stripe.com/);
      expect(createCheckoutSession).toHaveBeenCalledTimes(1);
    });

    it('should use stripe if paymentMethod=stripe', async () => {
      const dto: CheckoutDto = {
        plan: 'pro',
        interval: 'month',
        paymentMethod: 'stripe',
      };
      const result = await service.checkout(userId, dto);
      expect(result.url).toMatch(/checkout.stripe.com/);
      expect(createCheckoutSession).toHaveBeenCalledTimes(1);
    });

    it('should route to CinetPay gateway if paymentMethod=cinetpay', async () => {
      const dto: CheckoutDto = {
        plan: 'pro',
        interval: 'month',
        paymentMethod: 'cinetpay',
      };
      const result = await service.checkout(userId, dto);
      expect(result).toMatchObject({
        url: expect.stringMatching(/checkout.cinetpay.com/),
        paymentMethod: 'cinetpay',
      });
      expect(cinetpayGateway.createPayment).toHaveBeenCalledWith(userId, {
        plan: 'pro',
        interval: 'month',
        subscriptionId: 'sub-1',
      });
      expect(createCheckoutSession).not.toHaveBeenCalled();
    });

    it('should accept checkout DTO without paymentMethod (backward compatible)', async () => {
      const dto = Object.assign(new CheckoutDto(), {
        plan: 'pro',
        interval: 'month',
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should reject unknown paymentMethod', async () => {
      const dto = Object.assign(new CheckoutDto(), {
        plan: 'pro',
        interval: 'month',
        paymentMethod: 'paypal',
      });
      const errors = await validate(dto);
      expect(errors.some((e) => e.property === 'paymentMethod')).toBe(true);
    });

    it('should reject invalid plan enum', async () => {
      const dto = Object.assign(new CheckoutDto(), {
        plan: 'gold',
        interval: 'month',
      });
      const errors = await validate(dto);
      expect(errors.some((e) => e.property === 'plan')).toBe(true);
    });

    it('should reject invalid interval enum', async () => {
      const dto = Object.assign(new CheckoutDto(), {
        plan: 'pro',
        interval: 'weekly',
      });
      const errors = await validate(dto);
      expect(errors.some((e) => e.property === 'interval')).toBe(true);
    });

    it('should throw when CinetPay is requested but the gateway is missing', async () => {
      const noGateway = new SubscriptionsService(prisma as never, entitlements as never);
      await expect(
        noGateway.checkout(userId, { plan: 'pro', interval: 'month', paymentMethod: 'cinetpay' })
      ).rejects.toMatchObject({
        response: expect.objectContaining({ code: 'CINETPAY_NOT_CONFIGURED' }),
      });
    });
  });
});

describe('geo-based payment suggestion (v2)', () => {
  it.each([
    ['SN', 'cinetpay'],
    ['CI', 'cinetpay'],
    ['sn', 'cinetpay'],
    ['US', 'stripe'],
    ['FR', 'stripe'],
    [undefined, 'stripe'],
    ['', 'stripe'],
    ['XX', 'stripe'],
    ['ZZ', 'stripe'],
  ] as const)('country %s → %s', (country, expected) => {
    expect(suggestPaymentMethod(country || undefined)).toBe(expected);
  });
});

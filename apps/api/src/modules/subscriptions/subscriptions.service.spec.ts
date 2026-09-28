import { validate } from 'class-validator';
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

  it('persists stripeCustomerId when provided', async () => {
    await service.applyStripeSubscription({
      ...base,
      status: 'active',
      stripeCustomerId: 'cus_1',
    });

    expect(prisma.subscription.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ stripeCustomerId: 'cus_1' }),
        update: expect.objectContaining({ stripeCustomerId: 'cus_1' }),
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
      provider: 'stripe',
      periodEnd: future,
      stripeSubscriptionId: 'sub_ok_123',
    });

    expect(prisma.subscription.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({ lastPaymentError: null, provider: 'stripe' }),
        create: expect.objectContaining({
          currentPeriodEnd: future,
          lastPaymentError: null,
        }),
      })
    );
  });

  it.each([
    ['incomplete', 'suspended'],
    ['paused', 'suspended'],
    ['incomplete_expired', 'canceled'],
    ['some_future_status', 'suspended'],
  ])('grants no paid access for Stripe status %s (stored as %s)', async (status, stored) => {
    const result = await service.applyPaidEntitlement({
      userId,
      plan: 'pro',
      provider: 'stripe',
      status,
      periodEnd: future,
      stripeSubscriptionId: 'sub_123',
    });

    expect(result).toMatchObject({ status: stored });
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ subscriptionTier: 'free' }) })
    );
  });

  it.each(['active', 'trialing', 'past_due'])(
    'keeps the paid tier for status %s',
    async (status) => {
      await service.applyPaidEntitlement({
        userId,
        plan: 'business',
        provider: 'stripe',
        status,
        periodEnd: future,
        stripeSubscriptionId: 'sub_123',
      });

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ subscriptionTier: 'business' }) })
      );
    }
  );

  it('should persist currentPeriodEnd on create and update', async () => {
    await service.applyPaidEntitlement({
      userId,
      plan: 'pro',
      provider: 'stripe',
      periodEnd: future,
      stripeSubscriptionId: 'sub_period_1',
    });

    expect(prisma.subscription.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ currentPeriodEnd: future, provider: 'stripe' }),
        update: expect.objectContaining({ currentPeriodEnd: future, provider: 'stripe' }),
      })
    );
  });
});

describe('SubscriptionsService.checkout', () => {
  const userId = 'user-1';
  const prisma = {
    plan: { findUnique: jest.fn() },
    subscription: {
      upsert: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
    user: { findFirst: jest.fn(), update: jest.fn() },
  };
  const entitlements = {};
  let service: SubscriptionsService;
  let createCheckoutSession: jest.Mock;
  let createCustomer: jest.Mock;
  let listCustomers: jest.Mock;
  let updateCustomer: jest.Mock;
  let retrieveSubscription: jest.Mock;
  let listSubscriptions: jest.Mock;
  const prevPrices = {
    STRIPE_PRICE_PRO_MONTHLY: process.env.STRIPE_PRICE_PRO_MONTHLY,
    STRIPE_PRICE_PRO_YEARLY: process.env.STRIPE_PRICE_PRO_YEARLY,
    STRIPE_PRICE_PRO_ANNUAL: process.env.STRIPE_PRICE_PRO_ANNUAL,
    STRIPE_PRICE_BUSINESS_MONTHLY: process.env.STRIPE_PRICE_BUSINESS_MONTHLY,
    STRIPE_PRICE_BUSINESS_YEARLY: process.env.STRIPE_PRICE_BUSINESS_YEARLY,
    STRIPE_PRICE_BUSINESS_ANNUAL: process.env.STRIPE_PRICE_BUSINESS_ANNUAL,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.STRIPE_PRICE_PRO_MONTHLY = 'price_pro_month';
    process.env.STRIPE_PRICE_PRO_YEARLY = 'price_pro_year';
    process.env.STRIPE_PRICE_BUSINESS_MONTHLY = 'price_biz_month';
    process.env.STRIPE_PRICE_BUSINESS_YEARLY = 'price_biz_year';
    delete process.env.STRIPE_PRICE_PRO_ANNUAL;
    delete process.env.STRIPE_PRICE_BUSINESS_ANNUAL;
    prisma.user.findFirst.mockResolvedValue({
      id: userId,
      email: 'user@example.com',
      subscriptionTier: 'free',
      deletedAt: null,
    });
    prisma.subscription.findUnique.mockResolvedValue(null);
    prisma.subscription.update.mockResolvedValue({});
    prisma.subscription.create.mockResolvedValue({ id: 'sub-1', userId });
    prisma.plan.findUnique.mockImplementation(async (args: { where: { name: string } }) => {
      if (args.where.name === 'Pro') {
        return {
          id: 'plan-pro',
          name: 'Pro',
          priceMonthly: 9.99,
          priceYearly: 99,
          description: 'Pro plan',
        };
      }
      if (args.where.name === 'Business') {
        return {
          id: 'plan-biz',
          name: 'Business',
          priceMonthly: 29.99,
          priceYearly: 299,
          description: 'Business plan',
        };
      }
      if (args.where.name === 'Free') {
        return {
          id: 'plan-free',
          name: 'Free',
          priceMonthly: 0,
          priceYearly: 0,
          description: 'Free',
        };
      }
      return null;
    });
    prisma.user.update.mockResolvedValue({});
    prisma.subscription.upsert.mockResolvedValue({ id: 'sub-1', userId });
    service = new SubscriptionsService(prisma as never, entitlements as never);
    createCheckoutSession = jest.fn().mockResolvedValue({
      id: 'cs_test_123',
      url: 'https://checkout.stripe.com/c/pay/cs_test_123',
    });
    createCustomer = jest.fn().mockResolvedValue({ id: 'cus_new' });
    listCustomers = jest.fn().mockResolvedValue({ data: [] });
    updateCustomer = jest.fn().mockResolvedValue({ id: 'cus_old' });
    retrieveSubscription = jest.fn();
    // A customer with no subscription in Stripe, unless a test says otherwise.
    listSubscriptions = jest.fn().mockResolvedValue({ data: [] });
    (service as unknown as { stripe: unknown }).stripe = {
      checkout: { sessions: { create: createCheckoutSession } },
      customers: { create: createCustomer, list: listCustomers, update: updateCustomer },
      subscriptions: { retrieve: retrieveSubscription, list: listSubscriptions },
    };
  });

  afterEach(() => {
    (Object.keys(prevPrices) as Array<keyof typeof prevPrices>).forEach((key) => {
      const prev = prevPrices[key];
      if (prev === undefined) delete process.env[key];
      else process.env[key] = prev;
    });
  });

  describe('checkout validation', () => {
    it('opens a Stripe checkout session', async () => {
      const dto: CheckoutDto = { plan: 'pro', interval: 'month' };
      const result = await service.checkout(userId, dto);
      expect(result.url).toMatch(/checkout.stripe.com/);
      expect(createCheckoutSession).toHaveBeenCalledTimes(1);
    });

    it('should accept a checkout DTO with plan and interval', async () => {
      const dto = Object.assign(new CheckoutDto(), {
        plan: 'pro',
        interval: 'month',
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('rejects a payment method field (Stripe only)', async () => {
      const dto = Object.assign(new CheckoutDto(), {
        plan: 'pro',
        interval: 'month',
        paymentMethod: 'cinetpay',
      });
      const errors = await validate(dto, { whitelist: true, forbidNonWhitelisted: true });
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
  });

  describe('14-day trial', () => {
    it('sets a 14-day trial for first-time Stripe checkout', async () => {
      await service.checkout(userId, { plan: 'pro', interval: 'month' });

      expect(createCheckoutSession).toHaveBeenCalledWith(
        expect.objectContaining({
          subscription_data: expect.objectContaining({
            trial_period_days: 14,
            metadata: expect.objectContaining({
              userId,
              plan: 'pro',
              trial_days: '14',
            }),
          }),
        })
      );
    });

    it('does not grant another trial to an existing Stripe subscriber', async () => {
      prisma.user.findFirst.mockResolvedValue({
        id: userId,
        email: 'user@example.com',
        subscriptionTier: 'pro',
        deletedAt: null,
      });
      prisma.subscription.findUnique.mockResolvedValue({
        stripeSubscriptionId: 'sub_existing',
        stripeCustomerId: 'cus_existing',
      });

      await service.checkout(userId, { plan: 'business', interval: 'month' });

      const params = createCheckoutSession.mock.calls[0][0] as {
        subscription_data?: { trial_period_days?: number };
        customer?: string;
      };
      expect(params.subscription_data?.trial_period_days).toBeUndefined();
      expect(params.customer).toBe('cus_existing');
      expect(createCustomer).not.toHaveBeenCalled();
    });
  });

  describe('fail-closed checkout', () => {
    const prevFailClosed = process.env.STRIPE_FAIL_CLOSED;
    const prevNodeEnv = process.env.NODE_ENV;

    afterEach(() => {
      process.env.STRIPE_FAIL_CLOSED = prevFailClosed;
      process.env.NODE_ENV = prevNodeEnv;
    });

    it('rejects checkout when Stripe is missing (no dev_bypass)', async () => {
      delete process.env.STRIPE_FAIL_CLOSED;
      process.env.NODE_ENV = 'development';
      (service as unknown as { stripe: unknown }).stripe = null;

      await expect(
        service.checkout(userId, { plan: 'pro', interval: 'month' })
      ).rejects.toMatchObject({
        response: expect.objectContaining({ code: 'STRIPE_NOT_CONFIGURED' }),
      });
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('rejects checkout when Stripe is missing and fail-closed is on', async () => {
      process.env.STRIPE_FAIL_CLOSED = '1';
      process.env.NODE_ENV = 'development';
      (service as unknown as { stripe: unknown }).stripe = null;

      await expect(
        service.checkout(userId, { plan: 'pro', interval: 'month' })
      ).rejects.toMatchObject({
        response: expect.objectContaining({ code: 'STRIPE_NOT_CONFIGURED' }),
      });
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('blocks live Stripe keys unless STRIPE_ALLOW_LIVE=1', async () => {
      const prevKey = process.env.STRIPE_SECRET_KEY;
      const prevAllow = process.env.STRIPE_ALLOW_LIVE;
      process.env.STRIPE_SECRET_KEY = 'sk_live_blocked';
      delete process.env.STRIPE_ALLOW_LIVE;
      try {
        await expect(
          service.checkout(userId, { plan: 'pro', interval: 'month' })
        ).rejects.toMatchObject({
          response: expect.objectContaining({ code: 'STRIPE_LIVE_KEY_BLOCKED' }),
        });
        expect(createCheckoutSession).not.toHaveBeenCalled();
      } finally {
        process.env.STRIPE_SECRET_KEY = prevKey;
        process.env.STRIPE_ALLOW_LIVE = prevAllow;
      }
    });

    it('does not grant entitlements when Stripe Checkout throws', async () => {
      createCheckoutSession.mockRejectedValue(new Error('Stripe API unavailable'));

      await expect(service.checkout(userId, { plan: 'pro', interval: 'month' })).rejects.toThrow(
        /Stripe API unavailable/
      );
      expect(prisma.user.update).not.toHaveBeenCalled();
    });
  });

  describe('Stripe customer persistence', () => {
    it('creates a Stripe customer once and persists stripeCustomerId', async () => {
      await service.checkout(userId, { plan: 'pro', interval: 'month' });

      expect(createCustomer).toHaveBeenCalledWith({
        email: 'user@example.com',
        metadata: { userId },
      });
      expect(prisma.subscription.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId,
            planId: 'plan-free',
            stripeCustomerId: 'cus_new',
          }),
        })
      );
      const params = createCheckoutSession.mock.calls[0][0] as {
        customer?: string;
        customer_email?: string;
        line_items?: Array<{ price?: string; price_data?: unknown }>;
      };
      expect(params.customer).toBe('cus_new');
      expect(params.customer_email).toBeUndefined();
      expect(params.line_items?.[0]?.price).toBe('price_pro_month');
      expect(params.line_items?.[0]?.price_data).toBeUndefined();
    });

    it('reuses the persisted Stripe customer on a second checkout', async () => {
      prisma.subscription.findUnique.mockResolvedValue({
        stripeCustomerId: 'cus_existing',
        stripeSubscriptionId: null,
      });

      await service.checkout(userId, { plan: 'pro', interval: 'year' });

      expect(createCustomer).not.toHaveBeenCalled();
      expect(listCustomers).not.toHaveBeenCalled();
      expect(createCheckoutSession).toHaveBeenCalledWith(
        expect.objectContaining({
          customer: 'cus_existing',
          line_items: [{ price: 'price_pro_year', quantity: 1 }],
        })
      );
    });

    it('recovers the customer from an existing Stripe subscription', async () => {
      prisma.subscription.findUnique.mockResolvedValue({
        stripeCustomerId: null,
        stripeSubscriptionId: 'sub_existing',
      });
      retrieveSubscription.mockResolvedValue({ customer: 'cus_from_sub' });

      await service.checkout(userId, { plan: 'pro', interval: 'month' });

      expect(createCustomer).not.toHaveBeenCalled();
      expect(prisma.subscription.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { stripeCustomerId: 'cus_from_sub' },
        })
      );
      expect(createCheckoutSession).toHaveBeenCalledWith(
        expect.objectContaining({ customer: 'cus_from_sub' })
      );
    });

    it('reuses an untagged Stripe customer with the same email instead of creating another', async () => {
      listCustomers.mockResolvedValue({
        data: [{ id: 'cus_old', email: 'user@example.com', metadata: {} }],
      });

      await service.checkout(userId, { plan: 'pro', interval: 'month' });

      expect(createCustomer).not.toHaveBeenCalled();
      expect(updateCustomer).toHaveBeenCalledWith('cus_old', { metadata: { userId } });
      expect(createCheckoutSession).toHaveBeenCalledWith(
        expect.objectContaining({ customer: 'cus_old' })
      );
    });

    it('does not steal a Stripe customer tagged with another userId', async () => {
      listCustomers.mockResolvedValue({
        data: [{ id: 'cus_other', metadata: { userId: 'other-user' } }],
      });

      await service.checkout(userId, { plan: 'pro', interval: 'month' });

      expect(createCustomer).toHaveBeenCalled();
      expect(createCheckoutSession).toHaveBeenCalledWith(
        expect.objectContaining({ customer: 'cus_new' })
      );
    });
  });

  describe('catalog price fail-closed', () => {
    it('throws when STRIPE_PRICE_* is missing', async () => {
      delete process.env.STRIPE_PRICE_PRO_MONTHLY;

      await expect(
        service.checkout(userId, { plan: 'pro', interval: 'month' })
      ).rejects.toMatchObject({
        response: expect.objectContaining({ code: 'STRIPE_PRICE_NOT_CONFIGURED' }),
      });
      expect(createCheckoutSession).not.toHaveBeenCalled();
      expect(createCustomer).not.toHaveBeenCalled();
    });

    it('throws when STRIPE_PRICE_* is a placeholder', async () => {
      process.env.STRIPE_PRICE_PRO_MONTHLY = 'price_placeholder';

      await expect(
        service.checkout(userId, { plan: 'pro', interval: 'month' })
      ).rejects.toMatchObject({
        response: expect.objectContaining({ code: 'STRIPE_PRICE_NOT_CONFIGURED' }),
      });
      expect(createCheckoutSession).not.toHaveBeenCalled();
    });
  });

  describe('return URL allowlist', () => {
    const origin = 'http://localhost:3000';

    it('passes a valid /account/billing success URL through to Stripe', async () => {
      await service.checkout(userId, {
        plan: 'pro',
        interval: 'month',
        successUrl: `${origin}/account/billing?checkout=success`,
        cancelUrl: `${origin}/account/billing?checkout=cancel`,
      });

      expect(createCheckoutSession).toHaveBeenCalledWith(
        expect.objectContaining({
          success_url: `${origin}/account/billing?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${origin}/account/billing?checkout=cancel`,
        })
      );
    });

    it('blocks a different origin and uses the billing fallback', async () => {
      await service.checkout(userId, {
        plan: 'pro',
        interval: 'month',
        successUrl: 'https://evil.example/phish',
        cancelUrl: 'https://evil.example/cancel',
      });

      expect(createCheckoutSession).toHaveBeenCalledWith(
        expect.objectContaining({
          success_url: `${origin}/account/billing?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${origin}/account/billing?checkout=cancel`,
        })
      );
    });

    it('blocks an invalid path on the same origin', async () => {
      await service.checkout(userId, {
        plan: 'pro',
        interval: 'month',
        successUrl: `${origin}/dashboard`,
        cancelUrl: `${origin}/login`,
      });

      expect(createCheckoutSession).toHaveBeenCalledWith(
        expect.objectContaining({
          success_url: `${origin}/account/billing?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${origin}/account/billing?checkout=cancel`,
        })
      );
    });

    it('uses fallback when successUrl/cancelUrl are omitted', async () => {
      await service.checkout(userId, { plan: 'pro', interval: 'month' });

      expect(createCheckoutSession).toHaveBeenCalledWith(
        expect.objectContaining({
          success_url: `${origin}/account/billing?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${origin}/account/billing?checkout=cancel`,
        })
      );
    });

    it('uses fallback for a malformed URL', async () => {
      await service.checkout(userId, {
        plan: 'pro',
        interval: 'month',
        successUrl: 'not a url',
        cancelUrl: 'javascript:alert(1)',
      });

      expect(createCheckoutSession).toHaveBeenCalledWith(
        expect.objectContaining({
          success_url: `${origin}/account/billing?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${origin}/account/billing?checkout=cancel`,
        })
      );
    });
  });

  describe('existing Stripe subscriber (no second subscription)', () => {
    let updateSubscription: jest.Mock;
    let listSessions: jest.Mock;
    let expireSession: jest.Mock;

    function liveSub(overrides: Record<string, unknown> = {}) {
      return {
        id: 'sub_live',
        customer: 'cus_existing',
        status: 'active',
        cancel_at_period_end: false,
        current_period_start: 1_780_000_000,
        current_period_end: 1_782_592_000,
        metadata: { userId, plan: 'pro' },
        items: { data: [{ id: 'si_1', price: { id: 'price_pro_month' } }] },
        pending_update: null,
        latest_invoice: null,
        ...overrides,
      };
    }

    beforeEach(() => {
      prisma.user.findFirst.mockResolvedValue({
        id: userId,
        email: 'user@example.com',
        subscriptionTier: 'pro',
        deletedAt: null,
      });
      prisma.subscription.findUnique.mockResolvedValue({
        stripeSubscriptionId: 'sub_live',
        stripeCustomerId: 'cus_existing',
      });
      retrieveSubscription.mockResolvedValue(liveSub());
      updateSubscription = jest.fn(async (_id: string, params: Record<string, unknown>) =>
        liveSub({
          metadata: (params.metadata as Record<string, string>) ?? { userId, plan: 'pro' },
          items: { data: [{ id: 'si_1', price: { id: 'price_biz_month' } }] },
        })
      );
      listSessions = jest.fn().mockResolvedValue({ data: [] });
      expireSession = jest.fn().mockResolvedValue({});
      (service as unknown as { stripe: unknown }).stripe = {
        checkout: {
          sessions: { create: createCheckoutSession, list: listSessions, expire: expireSession },
        },
        customers: { create: createCustomer, list: listCustomers, update: updateCustomer },
        subscriptions: {
          retrieve: retrieveSubscription,
          update: updateSubscription,
          list: listSubscriptions,
        },
      };
    });

    it('upgrades Pro -> Business in place instead of opening a new Checkout', async () => {
      const result = await service.checkout(userId, { plan: 'business', interval: 'month' });

      expect(createCheckoutSession).not.toHaveBeenCalled();
      expect(updateSubscription).toHaveBeenNthCalledWith(
        1,
        'sub_live',
        expect.objectContaining({
          items: [{ id: 'si_1', price: 'price_biz_month' }],
          proration_behavior: 'always_invoice',
          payment_behavior: 'pending_if_incomplete',
        })
      );
      expect(updateSubscription).toHaveBeenNthCalledWith(
        2,
        'sub_live',
        expect.objectContaining({ metadata: expect.objectContaining({ plan: 'business' }) })
      );
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ subscriptionTier: 'business' }) })
      );
      expect(result).toMatchObject({
        mode: 'updated',
        plan: 'business',
        subscriptionId: 'sub_live',
      });
      expect(result.url).toContain('/account/billing?checkout=success');
    });

    it('treats monthly -> yearly on the same plan as an upgrade', async () => {
      await service.checkout(userId, { plan: 'pro', interval: 'year' });
      expect(updateSubscription.mock.calls[0][1]).toMatchObject({
        items: [{ id: 'si_1', price: 'price_pro_year' }],
        proration_behavior: 'always_invoice',
      });
      expect(createCheckoutSession).not.toHaveBeenCalled();
    });

    it('downgrades Business -> Pro with a credit and no immediate charge', async () => {
      retrieveSubscription.mockResolvedValue(
        liveSub({ items: { data: [{ id: 'si_1', price: { id: 'price_biz_month' } }] } })
      );
      await service.checkout(userId, { plan: 'pro', interval: 'month' });

      const params = updateSubscription.mock.calls[0][1] as Record<string, unknown>;
      expect(params.proration_behavior).toBe('create_prorations');
      expect(params.payment_behavior).toBeUndefined();
      expect(createCheckoutSession).not.toHaveBeenCalled();
    });

    it('changes plan without charging during a trial', async () => {
      retrieveSubscription.mockResolvedValue(liveSub({ status: 'trialing' }));
      await service.checkout(userId, { plan: 'business', interval: 'month' });

      const params = updateSubscription.mock.calls[0][1] as Record<string, unknown>;
      expect(params.proration_behavior).toBe('none');
      expect(params.payment_behavior).toBeUndefined();
    });

    it('sends the customer to the invoice when the upgrade payment needs action', async () => {
      updateSubscription.mockResolvedValueOnce(
        liveSub({
          pending_update: { expires_at: 1_780_086_400 },
          latest_invoice: { hosted_invoice_url: 'https://invoice.stripe.com/i/test' },
        })
      );

      const result = await service.checkout(userId, { plan: 'business', interval: 'month' });

      expect(result).toMatchObject({
        mode: 'payment_required',
        url: 'https://invoice.stripe.com/i/test',
      });
      expect(updateSubscription).toHaveBeenCalledTimes(1);
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('rejects re-subscribing to the current plan', async () => {
      await expect(
        service.checkout(userId, { plan: 'pro', interval: 'month' })
      ).rejects.toMatchObject({
        response: expect.objectContaining({ code: 'ALREADY_SUBSCRIBED' }),
      });
      expect(createCheckoutSession).not.toHaveBeenCalled();
      expect(updateSubscription).not.toHaveBeenCalled();
    });

    it('resumes a scheduled cancellation when the current plan is chosen again', async () => {
      retrieveSubscription.mockResolvedValue(liveSub({ cancel_at_period_end: true }));
      updateSubscription.mockResolvedValueOnce(liveSub({ cancel_at_period_end: false }));

      const result = await service.checkout(userId, { plan: 'pro', interval: 'month' });

      expect(updateSubscription).toHaveBeenCalledWith('sub_live', { cancel_at_period_end: false });
      expect(result).toMatchObject({ mode: 'resumed' });
      expect(createCheckoutSession).not.toHaveBeenCalled();
    });

    it('asks to fix the payment method before changing a past_due subscription', async () => {
      retrieveSubscription.mockResolvedValue(liveSub({ status: 'past_due' }));
      await expect(
        service.checkout(userId, { plan: 'business', interval: 'month' })
      ).rejects.toMatchObject({
        response: expect.objectContaining({ code: 'SUBSCRIPTION_PAYMENT_ISSUE' }),
      });
      expect(createCheckoutSession).not.toHaveBeenCalled();
      expect(updateSubscription).not.toHaveBeenCalled();
    });

    it('fails closed when Stripe cannot confirm the current subscription', async () => {
      retrieveSubscription.mockRejectedValue(new Error('Stripe down'));
      await expect(
        service.checkout(userId, { plan: 'business', interval: 'month' })
      ).rejects.toMatchObject({
        response: expect.objectContaining({ code: 'STRIPE_UNAVAILABLE' }),
      });
      expect(createCheckoutSession).not.toHaveBeenCalled();
    });

    it('opens a new Checkout when the previous subscription has ended', async () => {
      retrieveSubscription.mockResolvedValue(liveSub({ status: 'canceled' }));
      await service.checkout(userId, { plan: 'business', interval: 'month' });
      expect(createCheckoutSession).toHaveBeenCalledTimes(1);
      expect(updateSubscription).not.toHaveBeenCalled();
    });

    it('finds the Stripe subscription even before its webhook reached the database', async () => {
      // Pro was just paid: Stripe has sub_live, but checkout.session.completed has not been
      // processed yet, so the database only knows the customer.
      prisma.subscription.findUnique.mockResolvedValue({
        stripeSubscriptionId: null,
        stripeCustomerId: 'cus_existing',
      });
      listSubscriptions.mockResolvedValue({ data: [liveSub()] });

      const result = await service.checkout(userId, { plan: 'business', interval: 'month' });

      expect(listSubscriptions).toHaveBeenCalledWith(
        expect.objectContaining({ customer: 'cus_existing', status: 'all' })
      );
      expect(createCheckoutSession).not.toHaveBeenCalled();
      expect(updateSubscription.mock.calls[0]).toEqual([
        'sub_live',
        expect.objectContaining({ items: [{ id: 'si_1', price: 'price_biz_month' }] }),
      ]);
      expect(result).toMatchObject({
        mode: 'updated',
        plan: 'business',
        subscriptionId: 'sub_live',
      });
    });

    it('fails closed when Stripe cannot list the customer subscriptions', async () => {
      prisma.subscription.findUnique.mockResolvedValue({
        stripeSubscriptionId: null,
        stripeCustomerId: 'cus_existing',
      });
      listSubscriptions.mockRejectedValue(new Error('Stripe down'));

      await expect(
        service.checkout(userId, { plan: 'business', interval: 'month' })
      ).rejects.toMatchObject({
        response: expect.objectContaining({ code: 'STRIPE_UNAVAILABLE' }),
      });
      expect(createCheckoutSession).not.toHaveBeenCalled();
    });

    it('expires older open Checkout sessions before creating a new one', async () => {
      prisma.subscription.findUnique.mockResolvedValue({
        stripeSubscriptionId: null,
        stripeCustomerId: 'cus_existing',
      });
      listSessions.mockResolvedValue({
        data: [
          { id: 'cs_old_sub', mode: 'subscription' },
          { id: 'cs_marketplace', mode: 'payment' },
        ],
      });

      await service.checkout(userId, { plan: 'pro', interval: 'month' });

      expect(expireSession).toHaveBeenCalledTimes(1);
      expect(expireSession).toHaveBeenCalledWith('cs_old_sub');
      expect(createCheckoutSession).toHaveBeenCalledTimes(1);
    });
  });
});

describe('SubscriptionsService.cancelImmediately', () => {
  it('marks the local subscription canceled and drops the paid tier', async () => {
    const prisma = {
      plan: { findUnique: jest.fn() },
      subscription: {
        findUnique: jest.fn().mockResolvedValue({
          userId: 'user-1',
          stripeSubscriptionId: null,
        }),
        update: jest.fn().mockResolvedValue({}),
        upsert: jest.fn(),
      },
      user: { findFirst: jest.fn(), update: jest.fn().mockResolvedValue({}) },
    };
    const service = new SubscriptionsService(prisma as never, {} as never);
    const result = await service.cancelImmediately('user-1');
    expect(result).toEqual({ hadSubscription: true, stripeCanceled: false });
    expect(prisma.subscription.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'canceled' }),
      })
    );
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ subscriptionTier: 'free' }),
      })
    );
  });
});

describe('SubscriptionsService.billingPortal', () => {
  const prisma = {
    plan: { findUnique: jest.fn() },
    subscription: { findUnique: jest.fn() },
    user: { findFirst: jest.fn(), update: jest.fn() },
  };
  let createPortal: jest.Mock;
  let service: SubscriptionsService;
  const prevOrigin = process.env.APP_URL;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.APP_URL = 'https://app.example.com';
    service = new SubscriptionsService(prisma as never, {} as never);
    createPortal = jest.fn().mockResolvedValue({ url: 'https://billing.stripe.com/p/session_1' });
    (service as unknown as { stripe: unknown }).stripe = {
      billingPortal: { sessions: { create: createPortal } },
    };
  });

  afterEach(() => {
    if (prevOrigin === undefined) delete process.env.APP_URL;
    else process.env.APP_URL = prevOrigin;
  });

  it('opens a portal session for the stored Stripe customer, back to billing', async () => {
    prisma.subscription.findUnique.mockResolvedValue({
      userId: 'user-1',
      stripeCustomerId: 'cus_1',
    });

    await expect(service.billingPortal('user-1')).resolves.toEqual({
      url: 'https://billing.stripe.com/p/session_1',
    });
    expect(prisma.subscription.findUnique).toHaveBeenCalledWith({ where: { userId: 'user-1' } });
    expect(createPortal).toHaveBeenCalledWith({
      customer: 'cus_1',
      return_url: 'https://app.example.com/account/billing',
    });
  });

  it('refuses when the user never paid by card (no Stripe customer)', async () => {
    prisma.subscription.findUnique.mockResolvedValue({ userId: 'user-1', stripeCustomerId: null });

    await expect(service.billingPortal('user-1')).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'NO_BILLING_ACCOUNT' }),
    });
    expect(createPortal).not.toHaveBeenCalled();
  });

  it('reports the portal as unavailable when Stripe refuses (portal not activated)', async () => {
    prisma.subscription.findUnique.mockResolvedValue({
      userId: 'user-1',
      stripeCustomerId: 'cus_1',
    });
    createPortal.mockRejectedValue(new Error('No configuration provided'));

    await expect(service.billingPortal('user-1')).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'BILLING_PORTAL_UNAVAILABLE' }),
    });
  });

  it('fails closed when Stripe is not configured', async () => {
    (service as unknown as { stripe: unknown }).stripe = null;

    await expect(service.billingPortal('user-1')).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'STRIPE_NOT_CONFIGURED' }),
    });
  });
});

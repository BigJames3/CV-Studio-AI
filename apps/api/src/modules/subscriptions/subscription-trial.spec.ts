import type Stripe from 'stripe';
import { SubscriptionsService } from './subscriptions.service';
import { resolveEffectiveTier } from './effective-tier';
import { subscriptionPeriod } from '../payments/stripe-period';

/**
 * Trial / Checkout scenarios against an in-memory world with real semantics: the per-user lock
 * serializes like pg_advisory_xact_lock, `updateMany` is a compare-and-set, and every fake
 * Stripe call yields to the event loop so concurrent requests really interleave.
 */

const USER_ID = 'user-1';
const DAY = 24 * 60 * 60;
const ts = (iso: string) => Math.floor(new Date(iso).getTime() / 1000);
const tick = () => new Promise<void>((resolve) => setImmediate(resolve));

type UserRow = {
  id: string;
  email: string;
  subscriptionTier: string;
  deletedAt: null;
  trialUsed: boolean;
  trialStartedAt: Date | null;
  trialEndsAt: Date | null;
  trialStripeSubscriptionId: string | null;
  subscriptionStartDate?: Date | null;
  subscriptionEndDate?: Date | null;
};

type FakeSession = { id: string; customer: string; mode: 'subscription'; status: string };
type FakeSub = Stripe.Subscription & { trial_start: number | null; trial_end: number | null };

function createWorld(user: Partial<UserRow> = {}) {
  const db = {
    user: {
      id: USER_ID,
      email: 'user@example.com',
      subscriptionTier: 'free',
      deletedAt: null,
      trialUsed: false,
      trialStartedAt: null,
      trialEndsAt: null,
      trialStripeSubscriptionId: null,
      ...user,
    } as UserRow,
    subscription: null as Record<string, unknown> | null,
  };

  // Lock: one holder at a time, like pg_advisory_xact_lock on the same key.
  let lockChain = Promise.resolve();
  let insideLock = 0;
  let maxInsideLock = 0;

  const prisma = {
    user: {
      findFirst: jest.fn(async () => ({ ...db.user })),
      findUnique: jest.fn(async () => ({ ...db.user })),
      update: jest.fn(async ({ data }: { data: Partial<UserRow> }) => Object.assign(db.user, data)),
      updateMany: jest.fn(
        async ({ where, data }: { where: { trialUsed?: boolean }; data: Partial<UserRow> }) => {
          if (where.trialUsed === false && db.user.trialUsed) return { count: 0 };
          Object.assign(db.user, data);
          return { count: 1 };
        }
      ),
    },
    plan: {
      findUnique: jest.fn(async ({ where }: { where: { name: string } }) => ({
        id: `plan-${where.name}`,
        name: where.name,
      })),
    },
    subscription: {
      findUnique: jest.fn(async () => (db.subscription ? { ...db.subscription } : null)),
      create: jest.fn(async ({ data }: { data: Record<string, unknown> }) => {
        db.subscription = { ...data };
        return db.subscription;
      }),
      update: jest.fn(async ({ data }: { data: Record<string, unknown> }) =>
        Object.assign(db.subscription!, data)
      ),
      upsert: jest.fn(
        async (args: { create: Record<string, unknown>; update: Record<string, unknown> }) => {
          db.subscription = db.subscription
            ? Object.assign(db.subscription, args.update)
            : { ...args.create };
          return db.subscription;
        }
      ),
    },
    $transaction: jest.fn(async (fn: (tx: unknown) => Promise<unknown>) => {
      let release: () => void = () => undefined;
      let held = false;
      const tx = {
        $executeRaw: jest.fn(async () => {
          const previous = lockChain;
          lockChain = new Promise<void>((resolve) => (release = resolve));
          await previous;
          held = true;
          insideLock++;
          maxInsideLock = Math.max(maxInsideLock, insideLock);
        }),
      };
      try {
        return await fn(tx);
      } finally {
        if (held) insideLock--;
        release();
      }
    }),
  };

  const stripeState = {
    sessions: [] as Array<FakeSession & { params: Stripe.Checkout.SessionCreateParams }>,
    customers: [] as Array<{ id: string; email: string; metadata: Record<string, string> }>,
    subscriptions: [] as FakeSub[],
    customerKeys: new Map<string, string>(),
  };
  let seq = 0;

  const stripe = {
    customers: {
      list: jest.fn(async ({ email }: { email: string }) => {
        await tick();
        return { data: stripeState.customers.filter((c) => c.email === email) };
      }),
      create: jest.fn(
        async (
          params: { email: string; metadata: Record<string, string> },
          options?: { idempotencyKey?: string }
        ) => {
          await tick();
          const replay =
            options?.idempotencyKey && stripeState.customerKeys.get(options.idempotencyKey);
          if (replay) return stripeState.customers.find((c) => c.id === replay)!;
          const customer = { id: `cus_${++seq}`, email: params.email, metadata: params.metadata };
          stripeState.customers.push(customer);
          if (options?.idempotencyKey)
            stripeState.customerKeys.set(options.idempotencyKey, customer.id);
          return customer;
        }
      ),
      update: jest.fn(),
    },
    checkout: {
      sessions: {
        list: jest.fn(async ({ customer, status }: { customer: string; status: string }) => {
          await tick();
          return {
            data: stripeState.sessions.filter(
              (s) => s.customer === customer && s.status === status
            ),
          };
        }),
        expire: jest.fn(async (id: string) => {
          await tick();
          const session = stripeState.sessions.find((s) => s.id === id)!;
          session.status = 'expired';
          return session;
        }),
        create: jest.fn(async (params: Stripe.Checkout.SessionCreateParams) => {
          await tick();
          const session = {
            id: `cs_${++seq}`,
            customer: params.customer as string,
            mode: 'subscription' as const,
            status: 'open',
            url: `https://checkout.stripe.com/c/pay/cs_${seq}`,
            params,
          };
          stripeState.sessions.push(session);
          return session;
        }),
      },
    },
    subscriptions: {
      list: jest.fn(async ({ customer }: { customer: string }) => {
        await tick();
        return { data: stripeState.subscriptions.filter((s) => s.customer === customer) };
      }),
      retrieve: jest.fn(async (id: string) => {
        await tick();
        const sub = stripeState.subscriptions.find((s) => s.id === id);
        if (!sub)
          throw Object.assign(new Error('No such subscription'), { code: 'resource_missing' });
        return { ...sub };
      }),
      update: jest.fn(async (id: string, params: Record<string, unknown>) => {
        await tick();
        const sub = stripeState.subscriptions.find((s) => s.id === id)!;
        if (params.trial_end === 'now') {
          const now = Math.floor(Date.now() / 1000);
          Object.assign(sub, { status: 'active', trial_end: now, current_period_start: now });
        }
        if (params.cancel_at_period_end !== undefined) {
          Object.assign(sub, {
            cancel_at_period_end: params.cancel_at_period_end,
            canceled_at: params.cancel_at_period_end ? ts('2026-01-20T10:00:00Z') : null,
          });
        }
        if (params.items) {
          const [item] = params.items as Array<{ id: string; price: string }>;
          sub.items.data[0].price = { id: item.price } as Stripe.Price;
        }
        if (params.metadata) sub.metadata = params.metadata as Stripe.Metadata;
        return { ...sub, pending_update: null, latest_invoice: null };
      }),
    },
  };

  const service = new SubscriptionsService(prisma as never, {} as never);
  (service as unknown as { stripe: unknown }).stripe = stripe;

  /** What Stripe does when the customer pays a Checkout Session: start the subscription. */
  function completeSession(sessionId: string, start = '2026-01-15T00:00:00Z'): FakeSub {
    const session = stripeState.sessions.find((s) => s.id === sessionId)!;
    if (session.status !== 'open') throw new Error(`Session ${sessionId} is ${session.status}`);
    session.status = 'complete';
    const trialDays = session.params.subscription_data?.trial_period_days;
    const begin = ts(start);
    const end = trialDays ? begin + trialDays * DAY : ts('2026-02-15T00:00:00Z');
    const price = (session.params.line_items ?? [])[0]?.price as string;
    const sub = {
      id: `sub_${++seq}`,
      customer: session.customer,
      status: trialDays ? 'trialing' : 'active',
      trial_start: trialDays ? begin : null,
      trial_end: trialDays ? end : null,
      current_period_start: begin,
      current_period_end: end,
      cancel_at_period_end: false,
      canceled_at: null,
      metadata: session.params.subscription_data?.metadata ?? {},
      items: { data: [{ id: `si_${seq}`, price: { id: price } }] },
    } as unknown as FakeSub;
    stripeState.subscriptions.push(sub);
    return sub;
  }

  /** The webhook path: guard the trial, then sync what Stripe has. */
  async function fulfil(sub: Stripe.Subscription, plan: 'pro' | 'business' = 'pro') {
    const checked = await service.enforceSingleTrial(USER_ID, sub);
    const period = subscriptionPeriod(checked);
    await service.applyPaidEntitlement({
      userId: USER_ID,
      plan: checked.status === 'canceled' ? 'free' : plan,
      provider: 'stripe',
      status: checked.status,
      periodStart: period.start,
      periodEnd: period.end,
      stripeSubscriptionId: checked.id,
      stripeCustomerId: checked.customer as string,
      cancelAtPeriodEnd: checked.cancel_at_period_end,
    });
    return checked;
  }

  const trialSessions = () =>
    stripeState.sessions.filter((s) => s.params.subscription_data?.trial_period_days);

  return {
    db,
    prisma,
    stripe,
    stripeState,
    service,
    completeSession,
    fulfil,
    trialSessions,
    maxInsideLock: () => maxInsideLock,
  };
}

describe('Subscription trial: once per account', () => {
  const prev = {
    pm: process.env.STRIPE_PRICE_PRO_MONTHLY,
    py: process.env.STRIPE_PRICE_PRO_YEARLY,
    bm: process.env.STRIPE_PRICE_BUSINESS_MONTHLY,
    by: process.env.STRIPE_PRICE_BUSINESS_YEARLY,
  };

  beforeAll(() => {
    process.env.STRIPE_PRICE_PRO_MONTHLY = 'price_pro_month';
    process.env.STRIPE_PRICE_PRO_YEARLY = 'price_pro_year';
    process.env.STRIPE_PRICE_BUSINESS_MONTHLY = 'price_biz_month';
    process.env.STRIPE_PRICE_BUSINESS_YEARLY = 'price_biz_year';
  });

  afterAll(() => {
    const restore = (key: string, value: string | undefined) =>
      value === undefined ? delete process.env[key] : (process.env[key] = value);
    restore('STRIPE_PRICE_PRO_MONTHLY', prev.pm);
    restore('STRIPE_PRICE_PRO_YEARLY', prev.py);
    restore('STRIPE_PRICE_BUSINESS_MONTHLY', prev.bm);
    restore('STRIPE_PRICE_BUSINESS_YEARLY', prev.by);
  });

  it('1. grants 14 days on the first Checkout of a new account', async () => {
    const world = createWorld();
    await world.service.checkout(USER_ID, { plan: 'pro', interval: 'month' });

    const [session] = world.stripeState.sessions;
    expect(session.params.subscription_data).toMatchObject({
      trial_period_days: 14,
      trial_settings: { end_behavior: { missing_payment_method: 'cancel' } },
    });
    expect(session.params.line_items).toEqual([{ price: 'price_pro_month', quantity: 1 }]);
  });

  it('2. records the trial when Stripe starts it, with Stripe dates', async () => {
    const world = createWorld();
    await world.service.checkout(USER_ID, { plan: 'pro', interval: 'month' });
    const sub = world.completeSession(world.stripeState.sessions[0].id);
    await world.fulfil(sub);

    expect(world.db.user).toMatchObject({
      trialUsed: true,
      trialStripeSubscriptionId: sub.id,
      trialStartedAt: new Date('2026-01-15T00:00:00Z'),
      trialEndsAt: new Date('2026-01-29T00:00:00Z'),
      subscriptionTier: 'pro',
    });
    expect(world.db.subscription).toMatchObject({ status: 'trialing' });
  });

  it('3. gives no second trial after cancellation and re-subscription', async () => {
    const world = createWorld();
    await world.service.checkout(USER_ID, { plan: 'pro', interval: 'month' });
    const first = world.completeSession(world.stripeState.sessions[0].id);
    await world.fulfil(first);

    // The trial subscription ends (canceled), then the user subscribes again.
    Object.assign(first, { status: 'canceled' });
    await world.fulfil(first);
    await world.service.checkout(USER_ID, { plan: 'pro', interval: 'month' });

    expect(world.stripeState.sessions).toHaveLength(2);
    expect(world.trialSessions()).toHaveLength(1);
    expect(
      world.stripeState.sessions[1].params.subscription_data?.trial_period_days
    ).toBeUndefined();
  });

  it('4. gives no new trial on Pro -> Business, and keeps the running one unchanged', async () => {
    const world = createWorld();
    await world.service.checkout(USER_ID, { plan: 'pro', interval: 'month' });
    const sub = world.completeSession(world.stripeState.sessions[0].id);
    await world.fulfil(sub);

    const result = await world.service.checkout(USER_ID, { plan: 'business', interval: 'month' });

    expect(result).toMatchObject({ mode: 'updated' });
    expect(world.stripeState.sessions).toHaveLength(1);
    const change = world.stripe.subscriptions.update.mock.calls[0][1] as Record<string, unknown>;
    expect(change).toMatchObject({ proration_behavior: 'none' });
    expect(change).not.toHaveProperty('trial_end');
    expect(change).not.toHaveProperty('trial_period_days');
    expect(world.db.user.trialEndsAt).toEqual(new Date('2026-01-29T00:00:00Z'));
  });

  it('5. gives no trial on Business -> Pro after the trial was used', async () => {
    const world = createWorld({ trialUsed: true });
    await world.service.checkout(USER_ID, { plan: 'business', interval: 'year' });
    expect(world.trialSessions()).toHaveLength(0);
  });

  it('6. 3 concurrent checkouts: serialized, one open session, one trial at most', async () => {
    const world = createWorld();

    const results = await Promise.all([
      world.service.checkout(USER_ID, { plan: 'pro', interval: 'month' }),
      world.service.checkout(USER_ID, { plan: 'pro', interval: 'month' }),
      world.service.checkout(USER_ID, { plan: 'business', interval: 'month' }),
    ]);

    expect(results.every((r) => r.url)).toBe(true);
    expect(world.maxInsideLock()).toBe(1);
    expect(world.stripeState.customers).toHaveLength(1);
    const open = world.stripeState.sessions.filter((s) => s.status === 'open');
    expect(open).toHaveLength(1);
    expect(world.stripeState.sessions.filter((s) => s.status === 'expired')).toHaveLength(2);

    // Only the open session can still be paid: one trial in total.
    expect(() => world.completeSession(world.stripeState.sessions[0].id)).toThrow(/expired/);
    await world.fulfil(world.completeSession(open[0].id));
    await world.service.checkout(USER_ID, { plan: 'pro', interval: 'month' }).catch(() => null);
    const trialsStarted = world.stripeState.subscriptions.filter((s) => s.trial_start);
    expect(trialsStarted).toHaveLength(1);
  });

  it('7. a stale trial session paid after the trial was used is billed now (trial ended)', async () => {
    const world = createWorld();
    await world.service.checkout(USER_ID, { plan: 'pro', interval: 'month' });
    const staleSessionId = world.stripeState.sessions[0].id;
    const first = world.completeSession(staleSessionId);
    await world.fulfil(first);

    // A second subscription that Stripe started with a trial (e.g. a session created before
    // this release, or by hand in the Dashboard).
    const second = { ...first, id: 'sub_second', status: 'trialing' } as FakeSub;
    world.stripeState.subscriptions.push(second);
    const checked = await world.fulfil(second);

    expect(world.stripe.subscriptions.update).toHaveBeenCalledWith(
      'sub_second',
      { trial_end: 'now', proration_behavior: 'none' },
      { idempotencyKey: 'trial-end:sub_second' }
    );
    expect(checked.status).toBe('active');
    expect(world.db.user.trialStripeSubscriptionId).toBe(first.id);
  });

  it('8. card change / repeated events on the trial subscription keep the trial', async () => {
    const world = createWorld();
    await world.service.checkout(USER_ID, { plan: 'pro', interval: 'month' });
    const sub = world.completeSession(world.stripeState.sessions[0].id);
    await world.fulfil(sub);
    await world.fulfil(sub);
    await world.fulfil(sub);

    expect(world.stripe.subscriptions.update).not.toHaveBeenCalled();
    expect(world.db.subscription).toMatchObject({ status: 'trialing' });
  });

  it('9. legacy account with a past Stripe trial on its customer gets none, and is recorded', async () => {
    const world = createWorld();
    world.db.subscription = { userId: USER_ID, stripeCustomerId: 'cus_legacy' };
    world.stripeState.subscriptions.push({
      id: 'sub_legacy',
      customer: 'cus_legacy',
      status: 'canceled',
      trial_start: ts('2025-03-01T00:00:00Z'),
      trial_end: ts('2025-03-15T00:00:00Z'),
    } as unknown as FakeSub);

    await world.service.checkout(USER_ID, { plan: 'pro', interval: 'month' });

    expect(world.trialSessions()).toHaveLength(0);
    expect(world.db.user).toMatchObject({
      trialUsed: true,
      trialStripeSubscriptionId: 'sub_legacy',
    });
  });

  it('10. another Stripe customer for the same account does not reopen the trial', async () => {
    const world = createWorld({ trialUsed: true });
    // No stored customer, no Stripe history on the new one: the account flag decides.
    await world.service.checkout(USER_ID, { plan: 'pro', interval: 'month' });
    expect(world.stripeState.customers).toHaveLength(1);
    expect(world.trialSessions()).toHaveLength(0);
  });

  it('11. GET /subscriptions/me tells the client whether the trial is available', async () => {
    const fresh = createWorld();
    const entitlements = {
      snapshot: jest.fn().mockResolvedValue({
        tier: 'free',
        entitlements: {},
        cvCount: 0,
        cvLimit: 1,
        cvRemaining: 1,
      }),
    };
    (fresh.service as unknown as { entitlements: unknown }).entitlements = entitlements;
    await expect(fresh.service.me(USER_ID)).resolves.toMatchObject({ trialEligible: true });

    fresh.db.user.trialUsed = true;
    await expect(fresh.service.me(USER_ID)).resolves.toMatchObject({ trialEligible: false });
  });
});

describe('Billing periods come from Stripe', () => {
  it('monthly: 15 Jan -> 15 Feb', () => {
    const period = subscriptionPeriod({
      id: 'sub_m',
      current_period_start: ts('2026-01-15T00:00:00Z'),
      current_period_end: ts('2026-02-15T00:00:00Z'),
    } as Stripe.Subscription);
    expect(period).toEqual({
      start: new Date('2026-01-15T00:00:00Z'),
      end: new Date('2026-02-15T00:00:00Z'),
    });
  });

  it('yearly: 15 Jan 2026 -> 15 Jan 2027', () => {
    const period = subscriptionPeriod({
      id: 'sub_y',
      current_period_start: ts('2026-01-15T00:00:00Z'),
      current_period_end: ts('2027-01-15T00:00:00Z'),
    } as Stripe.Subscription);
    expect(period.end).toEqual(new Date('2027-01-15T00:00:00Z'));
  });

  it('stores exactly the Stripe dates on the subscription and the user', async () => {
    const world = createWorld();
    await world.service.applyPaidEntitlement({
      userId: USER_ID,
      plan: 'pro',
      provider: 'stripe',
      status: 'active',
      periodStart: new Date('2026-01-15T00:00:00Z'),
      periodEnd: new Date('2026-02-15T00:00:00Z'),
      stripeSubscriptionId: 'sub_m',
    });
    expect(world.db.subscription).toMatchObject({
      currentPeriodStart: new Date('2026-01-15T00:00:00Z'),
      currentPeriodEnd: new Date('2026-02-15T00:00:00Z'),
    });
    expect(world.db.user.subscriptionEndDate).toEqual(new Date('2026-02-15T00:00:00Z'));
  });
});

describe('Cancellation at period end', () => {
  it('stores what Stripe answered and keeps access until current_period_end', async () => {
    const world = createWorld();
    world.stripeState.subscriptions.push({
      id: 'sub_live',
      customer: 'cus_1',
      status: 'active',
      current_period_start: ts('2026-01-15T00:00:00Z'),
      current_period_end: ts('2026-02-15T00:00:00Z'),
      cancel_at_period_end: false,
      items: { data: [{ id: 'si_1', price: { id: 'price_pro_month' } }] },
    } as unknown as FakeSub);
    world.db.subscription = { userId: USER_ID, stripeSubscriptionId: 'sub_live', status: 'active' };

    await world.service.cancel(USER_ID);

    expect(world.db.subscription).toMatchObject({
      cancelAtPeriodEnd: true,
      canceledAt: new Date('2026-01-20T10:00:00Z'),
      currentPeriodEnd: new Date('2026-02-15T00:00:00Z'),
    });

    const source = {
      subscriptionTier: 'pro',
      subscription: {
        status: 'active',
        currentPeriodStart: new Date('2026-01-15T00:00:00Z'),
        currentPeriodEnd: new Date('2026-02-15T00:00:00Z'),
      },
    };
    expect(resolveEffectiveTier(source, new Date('2026-02-14T23:00:00Z'))).toBe('pro');
    // customer.subscription.deleted at period end -> canceled -> free.
    expect(
      resolveEffectiveTier(
        { ...source, subscription: { ...source.subscription, status: 'canceled' } },
        new Date('2026-02-15T00:00:01Z')
      )
    ).toBe('free');
  });

  it('keeps the Stripe canceled_at instead of the sync time', async () => {
    const world = createWorld();
    const canceledAt = new Date('2026-01-20T10:00:00Z');
    for (let i = 0; i < 2; i++) {
      await world.service.applyPaidEntitlement({
        userId: USER_ID,
        plan: 'pro',
        provider: 'stripe',
        status: 'active',
        periodStart: new Date('2026-01-15T00:00:00Z'),
        periodEnd: new Date('2026-02-15T00:00:00Z'),
        cancelAtPeriodEnd: true,
        canceledAt,
      });
    }
    expect(world.db.subscription).toMatchObject({ cancelAtPeriodEnd: true, canceledAt });
  });
});

describe('Which Stripe statuses grant paid access', () => {
  const sync = async (status: string) => {
    const world = createWorld();
    await world.service.applyPaidEntitlement({
      userId: USER_ID,
      plan: 'pro',
      provider: 'stripe',
      status,
      periodStart: new Date('2026-01-15T00:00:00Z'),
      periodEnd: new Date('2026-02-15T00:00:00Z'),
    });
    return { status: world.db.subscription!.status, tier: world.db.user.subscriptionTier };
  };

  it.each([
    ['active', 'active', 'pro'],
    ['trialing', 'trialing', 'pro'],
    ['past_due', 'past_due', 'pro'],
    ['unpaid', 'suspended', 'free'],
    ['incomplete', 'suspended', 'free'],
    ['paused', 'suspended', 'free'],
    ['incomplete_expired', 'canceled', 'free'],
    ['canceled', 'canceled', 'free'],
    ['something_new', 'suspended', 'free'],
  ])('Stripe %s -> local %s, tier %s', async (stripeStatus, local, tier) => {
    await expect(sync(stripeStatus)).resolves.toEqual({ status: local, tier });
  });
});

import { INestApplication } from '@nestjs/common';
import type Stripe from 'stripe';
import { createTestApp } from './create-test-app';
import { PrismaService } from '../src/database/prisma.module';
import { SubscriptionsService } from '../src/modules/subscriptions/subscriptions.service';
import { CvsService } from '../src/modules/cvs/cvs.service';

/**
 * Concurrency against the real Postgres: the advisory lock and the trial compare-and-set are
 * exercised for real. Only Stripe is faked (no network); each fake call waits a little so
 * concurrent requests overlap.
 */
describe('Subscription concurrency (e2e, real database)', () => {
  jest.setTimeout(60_000);
  let app: INestApplication;
  let prisma: PrismaService;
  let subscriptions: SubscriptionsService;
  let cvs: CvsService;
  const userIds: string[] = [];
  const prevPrices = {
    pro: process.env.STRIPE_PRICE_PRO_MONTHLY,
    biz: process.env.STRIPE_PRICE_BUSINESS_MONTHLY,
  };

  const wait = () => new Promise((resolve) => setTimeout(resolve, 15));

  async function createUser() {
    const user = await prisma.user.create({
      data: {
        email: `e2e+billing-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`,
        firstName: 'Billing',
        lastName: 'Concurrency',
      },
    });
    userIds.push(user.id);
    return user;
  }

  function fakeStripe() {
    const sessions: Array<{ id: string; customer: string; status: string; trial: boolean }> = [];
    const ended: string[] = [];
    let customers = 0;
    let inside = 0;
    let maxInside = 0;
    let seq = 0;
    const stripe = {
      customers: {
        list: async () => {
          inside++;
          maxInside = Math.max(maxInside, inside);
          await wait();
          return { data: [] };
        },
        create: async () => {
          await wait();
          customers++;
          return { id: `cus_e2e_${++seq}` };
        },
      },
      subscriptions: {
        list: async () => {
          await wait();
          return { data: [] };
        },
        update: async (id: string, params: { trial_end?: string }) => {
          await wait();
          if (params.trial_end === 'now') ended.push(id);
          return { id, status: 'active' };
        },
      },
      checkout: {
        sessions: {
          list: async ({ customer }: { customer: string }) => {
            await wait();
            return {
              data: sessions
                .filter((s) => s.customer === customer && s.status === 'open')
                .map((s) => ({ id: s.id, mode: 'subscription' })),
            };
          },
          expire: async (id: string) => {
            await wait();
            sessions.find((s) => s.id === id)!.status = 'expired';
          },
          create: async (params: Stripe.Checkout.SessionCreateParams) => {
            await wait();
            const session = {
              id: `cs_e2e_${++seq}`,
              customer: params.customer as string,
              status: 'open',
              trial: Boolean(params.subscription_data?.trial_period_days),
            };
            sessions.push(session);
            inside--;
            return { ...session, url: `https://checkout.stripe.com/c/pay/${session.id}` };
          },
        },
      },
    };
    (subscriptions as unknown as { stripe: unknown }).stripe = stripe;
    return { sessions, ended, customers: () => customers, maxInside: () => maxInside };
  }

  beforeAll(async () => {
    process.env.STRIPE_PRICE_PRO_MONTHLY = 'price_e2e_pro_month';
    process.env.STRIPE_PRICE_BUSINESS_MONTHLY = 'price_e2e_biz_month';
    app = await createTestApp();
    prisma = app.get(PrismaService);
    subscriptions = app.get(SubscriptionsService);
    cvs = app.get(CvsService);
  });

  afterAll(async () => {
    // Only the rows this suite created.
    if (prisma && userIds.length) {
      await prisma.cv.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.subscription.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    }
    if (app) await app.close();
    for (const [key, value] of [
      ['STRIPE_PRICE_PRO_MONTHLY', prevPrices.pro],
      ['STRIPE_PRICE_BUSINESS_MONTHLY', prevPrices.biz],
    ] as const) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  it('3 concurrent checkouts: one at a time, one Stripe customer, one open session', async () => {
    const user = await createUser();
    const stripe = fakeStripe();

    const results = await Promise.all([
      subscriptions.checkout(user.id, { plan: 'pro', interval: 'month' }),
      subscriptions.checkout(user.id, { plan: 'pro', interval: 'month' }),
      subscriptions.checkout(user.id, { plan: 'business', interval: 'month' }),
    ]);

    expect(results.every((r) => typeof r.url === 'string')).toBe(true);
    expect(stripe.maxInside()).toBe(1);
    expect(stripe.customers()).toBe(1);
    expect(stripe.sessions.filter((s) => s.status === 'open')).toHaveLength(1);
    expect(stripe.sessions.filter((s) => s.status === 'expired')).toHaveLength(2);
    const row = await prisma.subscription.findUnique({ where: { userId: user.id } });
    expect(row?.stripeCustomerId).toMatch(/^cus_e2e_/);
  });

  it('3 trialing subscriptions reported at once: one keeps the trial, two are billed now', async () => {
    const user = await createUser();
    const stripe = fakeStripe();
    const trialing = (id: string) =>
      ({
        id,
        status: 'trialing',
        trial_start: 1_768_435_200,
        trial_end: 1_769_644_800,
      }) as Stripe.Subscription;

    await Promise.all(
      ['sub_e2e_a', 'sub_e2e_b', 'sub_e2e_c'].map((id) =>
        subscriptions.enforceSingleTrial(user.id, trialing(id))
      )
    );

    const after = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(after.trialUsed).toBe(true);
    expect(after.trialEndsAt).toEqual(new Date(1_769_644_800 * 1000));
    expect(stripe.ended).toHaveLength(2);
    expect(stripe.ended).not.toContain(after.trialStripeSubscriptionId);
  });

  it('concurrent CV creation at the Free limit creates exactly one CV', async () => {
    const user = await createUser();

    const results = await Promise.allSettled(
      Array.from({ length: 5 }, (_, i) => cvs.create(user.id, { title: `CV ${i}` } as never))
    );

    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(await prisma.cv.count({ where: { userId: user.id, deletedAt: null } })).toBe(1);
  });
});

import { INestApplication } from '@nestjs/common';
import { createTestApp } from './create-test-app';
import { PrismaService } from '../src/database/prisma.module';
import { SubscriptionsService } from '../src/modules/subscriptions/subscriptions.service';
import { CvsService } from '../src/modules/cvs/cvs.service';
import { CATALOG_FALLBACK_ROWS } from '../src/modules/plans/plans.service';

/**
 * Concurrency against the real Postgres: the per-user billing lock and the unique payment
 * reference are exercised for real. No payment provider is called.
 */
describe('Subscription concurrency (e2e, real database)', () => {
  jest.setTimeout(60_000);
  let app: INestApplication;
  let prisma: PrismaService;
  let subscriptions: SubscriptionsService;
  let cvs: CvsService;
  const userIds: string[] = [];
  const createdPlanIds: string[] = [];

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

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    subscriptions = app.get(SubscriptionsService);
    cvs = app.get(CvsService);

    // CI migrates but does not seed: create the catalog plans that are missing (only those).
    for (const row of CATALOG_FALLBACK_ROWS) {
      if (await prisma.plan.findUnique({ where: { name: row.name } })) continue;
      const plan = await prisma.plan.create({ data: row });
      createdPlanIds.push(plan.id);
    }
  });

  afterAll(async () => {
    // Only the rows this suite created.
    if (prisma && userIds.length) {
      await prisma.cv.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.subscription.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    }
    if (prisma && createdPlanIds.length) {
      await prisma.plan.deleteMany({ where: { id: { in: createdPlanIds } } });
    }
    if (app) await app.close();
  });

  const payment = (userId: string, reference: string, paidAt: Date) => ({
    userId,
    plan: 'pro' as const,
    interval: 'month' as const,
    reference,
    amount: 660_000,
    currency: 'XOF',
    paidAt,
  });

  it('3 payments applied at once stack their months instead of overwriting each other', async () => {
    const user = await createUser();
    const paidAt = new Date('2026-10-20T10:00:00Z');
    const stamp = Date.now();

    const results = await Promise.all(
      ['a', 'b', 'c'].map((suffix) =>
        subscriptions.applyPrepaidPayment(payment(user.id, `sub_e2e_${stamp}_${suffix}`, paidAt))
      )
    );

    expect(results.every((r) => r.outcome === 'applied')).toBe(true);
    const row = await prisma.subscription.findUniqueOrThrow({
      where: { userId: user.id },
      include: { payments: true },
    });
    expect(row.currentPeriodEnd).toEqual(new Date('2027-01-20T10:00:00Z'));
    expect(row.payments).toHaveLength(3);
  });

  it('the same payment delivered 3 times at once is applied once', async () => {
    const user = await createUser();
    const reference = `sub_e2e_${Date.now()}_same`;
    const paidAt = new Date('2026-10-20T10:00:00Z');

    const results = await Promise.all(
      [1, 2, 3].map(() => subscriptions.applyPrepaidPayment(payment(user.id, reference, paidAt)))
    );

    expect(results.filter((r) => r.outcome === 'applied')).toHaveLength(1);
    const row = await prisma.subscription.findUniqueOrThrow({
      where: { userId: user.id },
      include: { payments: true, invoices: true },
    });
    expect(row.currentPeriodEnd).toEqual(new Date('2026-11-20T10:00:00Z'));
    expect(row.payments).toHaveLength(1);
    expect(row.invoices).toHaveLength(1);
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

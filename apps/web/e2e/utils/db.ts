import { createRequire } from 'module';
import path from 'path';

/**
 * Direct access to the E2E database for test setup only.
 *
 * Checkout is fail-closed without Stripe (no dev bypass, see
 * docs/PAYMENT_GATEWAY_SETUP.md), so tests that need a paid user seed the
 * subscription the way a verified payment would (applyPaidEntitlement).
 * Reuses the Prisma client generated for apps/api: no extra dependency.
 */
type PrismaLike = {
  plan: { findUnique(args: unknown): Promise<{ id: string } | null> };
  subscription: { upsert(args: unknown): Promise<unknown> };
  user: { update(args: unknown): Promise<unknown> };
  $disconnect(): Promise<void>;
};

const apiRequire = createRequire(path.resolve(__dirname, '../../../api/package.json'));

function prisma(): PrismaLike {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL must point at the E2E database to seed paid plans');
  }
  const { PrismaClient } = apiRequire('@prisma/client') as {
    PrismaClient: new () => PrismaLike;
  };
  return new PrismaClient();
}

export async function grantPlan(userId: string, tier: 'pro' | 'business') {
  const db = prisma();
  try {
    const planName = tier === 'business' ? 'Business' : 'Pro';
    const plan = await db.plan.findUnique({ where: { name: planName } });
    if (!plan) throw new Error(`Plan ${planName} missing: run prisma db seed`);

    const start = new Date();
    const end = new Date(start);
    end.setMonth(end.getMonth() + 1);
    const data = {
      planId: plan.id,
      status: 'active',
      provider: 'stripe',
      currentPeriodStart: start,
      currentPeriodEnd: end,
      lastPaymentError: null,
      cancelAtPeriodEnd: false,
      canceledAt: null,
    };
    await db.subscription.upsert({
      where: { userId },
      create: { userId, ...data },
      update: data,
    });
    await db.user.update({
      where: { id: userId },
      data: { subscriptionTier: tier, subscriptionStartDate: start, subscriptionEndDate: end },
    });
  } finally {
    await db.$disconnect();
  }
}

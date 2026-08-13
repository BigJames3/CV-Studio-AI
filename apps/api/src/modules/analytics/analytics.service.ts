import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.module';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { captureServerEvent } from '../../lib/analytics/posthog-server';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async dashboard(userId: string) {
    const [cvCount, viewSum, latestAts] = await Promise.all([
      this.prisma.cv.count({ where: { userId, deletedAt: null } }),
      this.prisma.cv.aggregate({
        where: { userId, deletedAt: null },
        _sum: { viewCount: true },
      }),
      this.prisma.atsReport.findFirst({
        where: { cv: { userId } },
        orderBy: { createdAt: 'desc' },
        select: { atsScore: true, createdAt: true },
      }),
    ]);

    return {
      cvsCreated: cvCount,
      totalViews: viewSum._sum.viewCount ?? 0,
      latestAtsScore: latestAts?.atsScore ?? null,
      latestAtsAt: latestAts?.createdAt ?? null,
    };
  }

  async events(userId: string, query: PaginationQueryDto) {
    const limit = query.limit ?? 50;
    const items = await this.prisma.analyticsEvent.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return { items };
  }

  /**
   * Dual-write: persist to analytics_events + forward to Amplitude (TODO).
   * Never accept CV body / secrets in properties — validated by API layer conventions.
   */
  async track(
    userId: string,
    input: {
      event: string;
      properties?: Record<string, unknown>;
      sessionId?: string;
      platform?: string;
    }
  ) {
    const props = {
      ...(input.properties ?? {}),
      session_id: input.sessionId,
      platform: input.platform ?? 'web',
    };
    const row = await this.prisma.analyticsEvent.create({
      data: {
        userId,
        eventType: input.event,
        eventData: props,
        sessionId: input.sessionId,
      },
    });
    captureServerEvent(userId, input.event, props);
    return { id: row.id, event: row.eventType, createdAt: row.createdAt };
  }

  /** Platform-wide admin metrics (MRR, tiers, churn). */
  async platformMetrics() {
    const [totalUsers, tierRows, plans, paidSubs, canceledThisMonth] = await Promise.all([
      this.prisma.user.count({ where: { deletedAt: null } }),
      this.prisma.user.groupBy({
        by: ['subscriptionTier'],
        where: { deletedAt: null },
        _count: { _all: true },
      }),
      this.prisma.plan.findMany({
        where: { name: { in: ['Pro', 'Business'] } },
        select: { name: true, priceMonthly: true },
      }),
      this.prisma.subscription.findMany({
        where: {
          status: { in: ['active', 'trialing', 'past_due'] },
          plan: { name: { in: ['Pro', 'Business'] } },
          user: { deletedAt: null },
        },
        include: {
          plan: { select: { name: true, priceMonthly: true } },
        },
      }),
      this.prisma.subscription.count({
        where: {
          status: 'canceled',
          canceledAt: {
            gte: startOfMonth(new Date()),
          },
        },
      }),
    ]);

    const priceByPlan = Object.fromEntries(
      plans.map((p) => [p.name.toLowerCase(), Number(p.priceMonthly)])
    ) as Record<string, number>;

    const defaultPrice: Record<string, number> = { pro: 9.99, business: 29.99 };

    let mrr = 0;
    let cancelingUsers = 0;
    for (const sub of paidSubs) {
      const key = sub.plan.name.toLowerCase();
      const price = priceByPlan[key] ?? defaultPrice[key] ?? 0;
      mrr += price;
      if (sub.cancelAtPeriodEnd) cancelingUsers += 1;
    }

    const paidUsers = paidSubs.length;
    const activePaidUsers = paidUsers - cancelingUsers;
    const churnRate = paidUsers > 0 ? (cancelingUsers / paidUsers) * 100 : 0;

    const tierBreakdown: Record<string, number> = { free: 0, pro: 0, business: 0 };
    for (const row of tierRows) {
      tierBreakdown[row.subscriptionTier] = row._count._all;
    }

    const monthStart = startOfMonth(new Date());
    const revenueAgg = await this.prisma.invoice.aggregate({
      where: {
        status: 'paid',
        OR: [{ paidAt: { gte: monthStart } }, { paidAt: null, createdAt: { gte: monthStart } }],
      },
      _sum: { amount: true },
    });

    return {
      totalUsers,
      tierBreakdown,
      mrr: round2(mrr),
      paidUsers,
      activePaidUsers,
      cancelingUsers,
      canceledThisMonth,
      churnRate: round2(churnRate),
      revenueThisMonth: round2(Number(revenueAgg._sum.amount ?? 0)),
      generatedAt: new Date().toISOString(),
    };
  }

  async revenueHistory(months = 12) {
    const safeMonths = Math.min(Math.max(months, 1), 24);
    const start = startOfMonth(new Date());
    start.setMonth(start.getMonth() - (safeMonths - 1));

    const invoices = await this.prisma.invoice.findMany({
      where: {
        status: 'paid',
        OR: [{ paidAt: { gte: start } }, { paidAt: null, createdAt: { gte: start } }],
      },
      select: { amount: true, paidAt: true, createdAt: true },
    });

    const buckets = new Map<string, number>();
    for (let i = 0; i < safeMonths; i++) {
      const d = new Date(start);
      d.setMonth(start.getMonth() + i);
      buckets.set(monthKey(d), 0);
    }

    for (const inv of invoices) {
      const when = inv.paidAt ?? inv.createdAt;
      const key = monthKey(when);
      if (!buckets.has(key)) continue;
      buckets.set(key, (buckets.get(key) ?? 0) + Number(inv.amount));
    }

    const items = Array.from(buckets.entries()).map(([key, revenue]) => {
      const [year, month] = key.split('-').map(Number);
      const date = new Date(year, month - 1, 1);
      return {
        month: date.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' }),
        monthKey: key,
        revenue: round2(revenue),
      };
    });

    return { items, months: safeMonths };
  }

  async cohortRetention(monthsBack = 12) {
    const safeMonths = Math.min(Math.max(monthsBack, 1), 24);
    const windowStart = startOfMonth(new Date());
    windowStart.setMonth(windowStart.getMonth() - (safeMonths - 1));
    const activeSince = new Date();
    activeSince.setDate(activeSince.getDate() - 30);

    const users = await this.prisma.user.findMany({
      where: { createdAt: { gte: windowStart }, deletedAt: null },
      select: {
        createdAt: true,
        lastLoginAt: true,
        subscriptionTier: true,
        subscription: { select: { status: true, cancelAtPeriodEnd: true } },
      },
    });

    const buckets = new Map<
      string,
      { cohortSize: number; retainedActive: number; retainedPaid: number }
    >();
    for (let i = 0; i < safeMonths; i++) {
      const d = new Date(windowStart);
      d.setMonth(windowStart.getMonth() + i);
      buckets.set(monthKey(d), { cohortSize: 0, retainedActive: 0, retainedPaid: 0 });
    }

    for (const user of users) {
      const key = monthKey(user.createdAt);
      const bucket = buckets.get(key);
      if (!bucket) continue;
      bucket.cohortSize += 1;
      const recentlyActive =
        (user.lastLoginAt != null && user.lastLoginAt >= activeSince) ||
        user.createdAt >= activeSince;
      if (recentlyActive) bucket.retainedActive += 1;
      const paid =
        (user.subscriptionTier === 'pro' || user.subscriptionTier === 'business') &&
        user.subscription?.status !== 'canceled' &&
        !user.subscription?.cancelAtPeriodEnd;
      if (paid) bucket.retainedPaid += 1;
    }

    return Array.from(buckets.entries()).map(([key, row]) => {
      const [year, month] = key.split('-').map(Number);
      const date = new Date(year, month - 1, 1);
      return {
        month: date.toISOString().slice(0, 10),
        monthKey: key,
        cohortSize: row.cohortSize,
        retained: row.retainedActive,
        retainedPaid: row.retainedPaid,
        retentionRate: pct(row.retainedActive, row.cohortSize),
        paidRetentionRate: pct(row.retainedPaid, row.cohortSize),
      };
    });
  }

  async funnelAnalysis() {
    const [signup, emailVerified, dashboard, cvCreated, upgraded] = await Promise.all([
      this.prisma.user.count({ where: { deletedAt: null } }),
      this.prisma.user.count({ where: { deletedAt: null, isEmailVerified: true } }),
      this.prisma.user.count({ where: { deletedAt: null, lastLoginAt: { not: null } } }),
      this.prisma.user.count({
        where: { deletedAt: null, cvs: { some: { deletedAt: null } } },
      }),
      this.prisma.user.count({
        where: { deletedAt: null, subscriptionTier: { in: ['pro', 'business'] } },
      }),
    ]);

    return {
      signup: { count: signup, rate: 100 },
      emailVerified: { count: emailVerified, rate: pct(emailVerified, signup) },
      dashboard: { count: dashboard, rate: pct(dashboard, signup) },
      cvCreated: { count: cvCreated, rate: pct(cvCreated, dashboard) },
      upgraded: { count: upgraded, rate: pct(upgraded, cvCreated) },
    };
  }

  async customerAcquisitionCost(period: 'month' | 'quarter' | 'year' = 'month') {
    const marketingSpend = Number(process.env.ANALYTICS_MARKETING_SPEND_MONTHLY ?? 0);
    const startDate = new Date();
    if (period === 'month') startDate.setMonth(startDate.getMonth() - 1);
    else if (period === 'quarter') startDate.setMonth(startDate.getMonth() - 3);
    else startDate.setFullYear(startDate.getFullYear() - 1);

    const multiplier = period === 'month' ? 1 : period === 'quarter' ? 3 : 12;
    const spend = round2(marketingSpend * multiplier);

    const newCustomers = await this.prisma.user.count({
      where: {
        deletedAt: null,
        createdAt: { gte: startDate },
        subscriptionTier: { in: ['pro', 'business'] },
      },
    });

    return {
      period,
      marketingSpend: spend,
      newCustomers,
      cac: newCustomers > 0 && spend > 0 ? round2(spend / newCustomers) : 0,
    };
  }

  async lifetimeValue() {
    const metrics = await this.platformMetrics();
    const arpu = metrics.paidUsers > 0 ? metrics.mrr / metrics.paidUsers : 0;
    const monthlyChurn = metrics.paidUsers > 0 ? metrics.churnRate / 100 : 0;
    const avgLifetimeMonths = monthlyChurn > 0 ? 1 / monthlyChurn : 24;
    const ltv = round2(arpu * avgLifetimeMonths);

    return {
      ltv,
      arpu: round2(arpu),
      avgLifetimeMonths: round2(avgLifetimeMonths),
      paidUsers: metrics.paidUsers,
      mrr: metrics.mrr,
    };
  }
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function monthKey(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function pct(part: number, total: number) {
  if (total <= 0) return 0;
  return round2((part / total) * 100);
}

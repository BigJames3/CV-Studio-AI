import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.module';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import {
  captureServerEvent,
  getMarketingSpendMonthly,
  sanitizeEventProperties,
} from '../../observability/posthog';

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
   * CAC = monthly marketing spend / new paid customers this calendar month.
   * Returns null CAC when spend is 0 (dashboard should show "—").
   */
  async unitEconomics() {
    const marketingSpendMonthly = getMarketingSpendMonthly();
    const start = new Date();
    start.setUTCDate(1);
    start.setUTCHours(0, 0, 0, 0);

    const newPaidCustomers = await this.prisma.user.count({
      where: {
        deletedAt: null,
        subscriptionTier: { in: ['pro', 'business'] },
        createdAt: { gte: start },
      },
    });

    const cac =
      marketingSpendMonthly > 0 && newPaidCustomers > 0
        ? Math.round((marketingSpendMonthly / newPaidCustomers) * 100) / 100
        : null;

    return {
      marketingSpendMonthly,
      newPaidCustomers,
      cac,
      periodStart: start.toISOString(),
    };
  }

  /**
   * Dual-write: persist to analytics_events + forward to PostHog.
   * Never accept CV body / secrets in properties — stripped server-side.
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
    const props = sanitizeEventProperties({
      ...(input.properties ?? {}),
      session_id: input.sessionId,
      platform: input.platform ?? 'web',
    });
    const row = await this.prisma.analyticsEvent.create({
      data: {
        userId,
        eventType: input.event,
        eventData: props as Prisma.InputJsonValue,
        sessionId: input.sessionId,
      },
    });
    captureServerEvent({
      distinctId: userId,
      event: input.event,
      properties: props,
    });
    return { id: row.id, event: row.eventType, createdAt: row.createdAt };
  }
}

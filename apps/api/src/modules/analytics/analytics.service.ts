import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.module';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

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
    // TODO: Amplitude HTTP API forward (server key from Secrets Manager)
    return { id: row.id, event: row.eventType, createdAt: row.createdAt };
  }
}

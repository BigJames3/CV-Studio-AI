import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.module';
import { EntitlementsService } from '../subscriptions/entitlements.service';
import {
  classifySource,
  dailyVisitorHash,
  isBotUserAgent,
  referrerHost,
  VIEW_SOURCES,
  type ViewSource,
} from './cv-view.util';

export const ANALYTICS_PERIODS = [7, 30, 90] as const;
export type AnalyticsPeriod = (typeof ANALYTICS_PERIODS)[number];

/** A reload or a second tab within this window is the same visit. */
export const VIEW_DEDUP_MS = 30 * 60 * 1000;

const DAY_MS = 24 * 60 * 60 * 1000;

function ownHosts(): string[] {
  return [process.env.NEXT_PUBLIC_APP_URL, process.env.APP_URL]
    .map((url) => referrerHost(url))
    .filter((host): host is string => Boolean(host));
}

function visitorSecret(): string {
  return process.env.ENCRYPTION_KEY ?? process.env.JWT_ACCESS_SECRET ?? '';
}

@Injectable()
export class CvAnalyticsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly entitlements: EntitlementsService
  ) {}

  /**
   * Record one visit of a public CV. Bots and repeat loads from the same visitor within
   * `VIEW_DEDUP_MS` are ignored. `viewCount` is kept in step for the basic dashboard.
   */
  async recordView(
    slug: string,
    input: { src?: string; referrer?: string },
    client: { ip: string; userAgent?: string },
    now = new Date()
  ): Promise<{ recorded: boolean }> {
    const cv = await this.prisma.cv.findFirst({
      where: { publicUrl: slug, isPublic: true, deletedAt: null },
      select: { id: true },
    });
    if (!cv) throw new NotFoundException({ code: 'NOT_FOUND', message: 'CV not found' });
    if (isBotUserAgent(client.userAgent)) return { recorded: false };

    const visitorHash = dailyVisitorHash(client.ip, client.userAgent ?? '', now, visitorSecret());
    const recent = await this.prisma.cvView.findFirst({
      where: {
        cvId: cv.id,
        visitorHash,
        viewedAt: { gte: new Date(now.getTime() - VIEW_DEDUP_MS) },
      },
      select: { id: true },
    });
    if (recent) return { recorded: false };

    const host = referrerHost(input.referrer);
    await this.prisma.$transaction([
      this.prisma.cvView.create({
        data: {
          cvId: cv.id,
          viewedAt: now,
          source: classifySource(input.src, host, ownHosts()),
          referrerHost: host,
          visitorHash,
        },
      }),
      this.prisma.cv.update({ where: { id: cv.id }, data: { viewCount: { increment: 1 } } }),
    ]);
    return { recorded: true };
  }

  /** Views of the caller's CVs over the last `days` days (Business). */
  async report(userId: string, days: AnalyticsPeriod, now = new Date()) {
    await this.entitlements.assertCan(
      userId,
      'analytics:advanced',
      'Detailed analytics require a Business plan'
    );
    // Whole UTC days: today plus the `days - 1` before it.
    const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
    const since = new Date(today - (days - 1) * DAY_MS);
    const scope: Prisma.CvViewWhereInput = {
      viewedAt: { gte: since },
      cv: { userId, deletedAt: null },
    };

    const [cvs, perCv, perSource, visitors, daily] = await Promise.all([
      this.prisma.cv.findMany({
        where: { userId, deletedAt: null },
        select: { id: true, title: true, isPublic: true },
        orderBy: { updatedAt: 'desc' },
      }),
      this.prisma.cvView.groupBy({
        by: ['cvId'],
        where: scope,
        _count: { _all: true },
        _max: { viewedAt: true },
      }),
      this.prisma.cvView.groupBy({ by: ['source'], where: scope, _count: { _all: true } }),
      this.prisma.cvView.groupBy({ by: ['cvId', 'visitorHash'], where: scope }),
      this.prisma.$queryRaw<Array<{ day: Date; views: bigint }>>`
        SELECT date_trunc('day', v.viewed_at AT TIME ZONE 'UTC') AS day, count(*) AS views
        FROM cv_views v
        JOIN cvs c ON c.id = v.cv_id
        WHERE c.user_id = ${userId}::uuid AND c.deleted_at IS NULL AND v.viewed_at >= ${since}
        GROUP BY 1`,
    ]);

    const visitorsByCv = new Map<string, number>();
    for (const row of visitors) visitorsByCv.set(row.cvId, (visitorsByCv.get(row.cvId) ?? 0) + 1);
    const viewsByCv = new Map(perCv.map((row) => [row.cvId, row]));
    const viewsByDay = new Map(
      daily.map((row) => [new Date(row.day).toISOString().slice(0, 10), Number(row.views)])
    );
    const viewsBySource = new Map(perSource.map((row) => [row.source, row._count._all]));

    const series = Array.from({ length: days }, (_, i) => {
      const date = new Date(since.getTime() + i * DAY_MS).toISOString().slice(0, 10);
      return { date, views: viewsByDay.get(date) ?? 0 };
    });

    return {
      days,
      since: since.toISOString(),
      totals: {
        views: perCv.reduce((sum, row) => sum + row._count._all, 0),
        // Visitor hashes are salted per day: this counts one person once per day.
        dailyVisitors: visitors.length,
        publicCvs: cvs.filter((cv) => cv.isPublic).length,
      },
      series,
      sources: VIEW_SOURCES.map((source: ViewSource) => ({
        source,
        views: viewsBySource.get(source) ?? 0,
      }))
        .filter((row) => row.views > 0)
        .sort((a, b) => b.views - a.views),
      cvs: cvs
        .map((cv) => ({
          id: cv.id,
          title: cv.title,
          isPublic: cv.isPublic,
          views: viewsByCv.get(cv.id)?._count._all ?? 0,
          dailyVisitors: visitorsByCv.get(cv.id) ?? 0,
          lastViewedAt: viewsByCv.get(cv.id)?._max.viewedAt ?? null,
        }))
        .sort((a, b) => b.views - a.views),
    };
  }
}

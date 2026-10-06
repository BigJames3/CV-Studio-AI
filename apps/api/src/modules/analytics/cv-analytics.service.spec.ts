import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { CvAnalyticsService, VIEW_DEDUP_MS } from './cv-analytics.service';

const CHROME = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/129.0 Safari/537.36';
const NOW = new Date('2026-09-27T10:00:00Z');

function setup() {
  const prisma = {
    cv: { findFirst: jest.fn(), findMany: jest.fn(), update: jest.fn((a) => ({ op: 'cv', a })) },
    cvView: {
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn((a) => ({ op: 'view', a })),
      groupBy: jest.fn(),
    },
    $transaction: jest.fn().mockResolvedValue([]),
    $queryRaw: jest.fn(),
  };
  const entitlements = { assertCan: jest.fn().mockResolvedValue(undefined) };
  return {
    prisma,
    entitlements,
    service: new CvAnalyticsService(prisma as never, entitlements as never),
  };
}

describe('CvAnalyticsService.recordView', () => {
  it('records a visit with its source and bumps viewCount', async () => {
    const { service, prisma } = setup();
    prisma.cv.findFirst.mockResolvedValue({ id: 'cv-1' });

    await expect(
      service.recordView(
        'cv-abc',
        { referrer: 'https://www.linkedin.com/feed/' },
        { ip: '1.2.3.4', userAgent: CHROME },
        NOW
      )
    ).resolves.toEqual({ recorded: true });

    expect(prisma.cvView.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        cvId: 'cv-1',
        source: 'linkedin',
        referrerHost: 'linkedin.com',
        visitorHash: expect.stringMatching(/^[0-9a-f]{32}$/),
      }),
    });
    expect(prisma.cv.update).toHaveBeenCalledWith({
      where: { id: 'cv-1' },
      data: { viewCount: { increment: 1 } },
    });
    // The raw IP is never written.
    expect(JSON.stringify(prisma.cvView.create.mock.calls)).not.toContain('1.2.3.4');
  });

  it('only accepts published CVs', async () => {
    const { service, prisma } = setup();
    prisma.cv.findFirst.mockResolvedValue(null);
    await expect(
      service.recordView('nope', {}, { ip: '1.1.1.1', userAgent: CHROME }, NOW)
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.cv.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { publicUrl: 'nope', isPublic: true, deletedAt: null },
      })
    );
  });

  it('ignores bots and reloads within the dedup window', async () => {
    const { service, prisma } = setup();
    prisma.cv.findFirst.mockResolvedValue({ id: 'cv-1' });

    await expect(
      service.recordView('s', {}, { ip: '1.1.1.1', userAgent: 'Googlebot/2.1' }, NOW)
    ).resolves.toEqual({ recorded: false });

    prisma.cvView.findFirst.mockResolvedValueOnce({ id: 'v-1' });
    await expect(
      service.recordView('s', {}, { ip: '1.1.1.1', userAgent: CHROME }, NOW)
    ).resolves.toEqual({ recorded: false });
    expect(prisma.cvView.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          viewedAt: { gte: new Date(NOW.getTime() - VIEW_DEDUP_MS) },
        }),
      })
    );
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});

describe('CvAnalyticsService.report', () => {
  it('is Business-only', async () => {
    const { service, entitlements } = setup();
    entitlements.assertCan.mockRejectedValue(new ForbiddenException('Business'));
    await expect(service.report('u1', 30, NOW)).rejects.toBeInstanceOf(ForbiddenException);
    expect(entitlements.assertCan).toHaveBeenCalledWith(
      'u1',
      'analytics:advanced',
      expect.any(String)
    );
  });

  it('aggregates per CV, per source and per day, filling empty days', async () => {
    const { service, prisma } = setup();
    prisma.cv.findMany.mockResolvedValue([
      { id: 'cv-1', title: 'Dev', isPublic: true },
      { id: 'cv-2', title: 'Draft', isPublic: false },
    ]);
    prisma.cvView.groupBy.mockImplementation(async ({ by }: { by: string[] }) => {
      if (by.join() === 'cvId') {
        return [{ cvId: 'cv-1', _count: { _all: 3 }, _max: { viewedAt: NOW } }];
      }
      if (by.join() === 'source') {
        return [
          { source: 'qr', _count: { _all: 1 } },
          { source: 'linkedin', _count: { _all: 2 } },
        ];
      }
      return [
        { cvId: 'cv-1', visitorHash: 'a' },
        { cvId: 'cv-1', visitorHash: 'b' },
      ];
    });
    prisma.$queryRaw.mockResolvedValue([
      { day: new Date('2026-09-27T00:00:00Z'), views: BigInt(2) },
      { day: new Date('2026-09-25T00:00:00Z'), views: BigInt(1) },
    ]);

    const report = await service.report('u1', 7, NOW);

    expect(report.totals).toEqual({ views: 3, dailyVisitors: 2, publicCvs: 1 });
    expect(report.series).toHaveLength(7);
    expect(report.series[0]).toEqual({ date: '2026-09-21', views: 0 });
    expect(report.series.slice(-3)).toEqual([
      { date: '2026-09-25', views: 1 },
      { date: '2026-09-26', views: 0 },
      { date: '2026-09-27', views: 2 },
    ]);
    expect(report.sources).toEqual([
      { source: 'linkedin', views: 2 },
      { source: 'qr', views: 1 },
    ]);
    expect(report.cvs).toEqual([
      { id: 'cv-1', title: 'Dev', isPublic: true, views: 3, dailyVisitors: 2, lastViewedAt: NOW },
      {
        id: 'cv-2',
        title: 'Draft',
        isPublic: false,
        views: 0,
        dailyVisitors: 0,
        lastViewedAt: null,
      },
    ]);
    // Only the caller's live CVs, from the first day of the window.
    expect(prisma.cvView.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          viewedAt: { gte: new Date('2026-09-21T00:00:00Z') },
          cv: { userId: 'u1', deletedAt: null },
        },
      })
    );
  });
});

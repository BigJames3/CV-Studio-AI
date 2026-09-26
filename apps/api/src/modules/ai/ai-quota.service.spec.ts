import { ForbiddenException } from '@nestjs/common';
import { AiQuotaService } from './ai-quota.service';

/**
 * In-memory Prisma double. `$transaction` runs callbacks one at a time, like the per-user
 * Postgres advisory lock does, so concurrency tests exercise the real count-then-insert flow.
 */
function makePrisma(initialRows = 0) {
  let rows = Array.from({ length: initialRows }, (_, i) => ({
    id: `seed-${i}`,
    actionType: 'resume_optimization',
    createdAt: new Date(),
  }));
  let nextId = 0;
  let chain: Promise<unknown> = Promise.resolve();

  const aiHistory = {
    count: jest.fn(
      async ({ where }: { where: { actionType: string } }) =>
        rows.filter((r) => r.actionType === where.actionType).length
    ),
    create: jest.fn(async ({ data }: { data: { actionType: string } }) => {
      const row = { id: `res-${nextId++}`, actionType: data.actionType, createdAt: new Date() };
      rows.push(row);
      return { id: row.id };
    }),
    update: jest.fn().mockResolvedValue({}),
    deleteMany: jest.fn(async ({ where }: { where: { id: string } }) => {
      const before = rows.length;
      rows = rows.filter((r) => r.id !== where.id);
      return { count: before - rows.length };
    }),
  };
  const tx = { $executeRaw: jest.fn().mockResolvedValue(1), aiHistory };
  const prisma = {
    aiHistory,
    $transaction: jest.fn((fn: (client: typeof tx) => Promise<unknown>) => {
      const run = chain.then(() => fn(tx));
      chain = run.catch(() => undefined);
      return run;
    }),
  };
  return { prisma, tx, rows: () => rows };
}

function makeService(tier: 'free' | 'pro' | 'business', initialRows = 0) {
  const db = makePrisma(initialRows);
  const entitlements = { getTier: jest.fn().mockResolvedValue(tier) };
  return { ...db, service: new AiQuotaService(db.prisma as never, entitlements as never) };
}

describe('AiQuotaService', () => {
  it('reserves a slot under the per-user lock when under the daily Pro limit', async () => {
    const { service, tx } = makeService('pro', 12);

    await expect(service.reserveOptimizeQuota('user-1', 'cv-1')).resolves.toEqual({
      id: 'res-0',
      used: 12,
      limit: 50,
    });
    expect(tx.$executeRaw).toHaveBeenCalledTimes(1);
    expect(tx.aiHistory.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 'user-1',
          cvId: 'cv-1',
          actionType: 'resume_optimization',
        }),
      })
    );
  });

  it('rejects optimize when the Pro daily quota is exhausted', async () => {
    const { service, tx } = makeService('pro', 50);

    await expect(service.reserveOptimizeQuota('user-1')).rejects.toBeInstanceOf(ForbiddenException);
    expect(tx.aiHistory.create).not.toHaveBeenCalled();
  });

  it('rejects free tier optimize via zero daily limit', async () => {
    const { service } = makeService('free');
    await expect(service.reserveOptimizeQuota('user-1')).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'AI_QUOTA_EXCEEDED' }),
    });
  });

  it('applies the right limits to cover letters and ATS explain', async () => {
    await expect(makeService('pro').service.reserveCoverLetterQuota('u')).resolves.toMatchObject({
      limit: 20,
    });
    await expect(
      makeService('business').service.reserveAtsExplainQuota('u')
    ).resolves.toMatchObject({ limit: 100 });
    await expect(makeService('free').service.reserveAtsExplainQuota('u')).resolves.toMatchObject({
      limit: 1,
    });
  });

  it('never exceeds the limit under concurrent requests (Pro, 49 used + 10 parallel)', async () => {
    const { service, rows } = makeService('pro', 49);

    const results = await Promise.allSettled(
      Array.from({ length: 10 }, () => service.reserveOptimizeQuota('user-1'))
    );

    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter((r) => r.status === 'rejected')).toHaveLength(9);
    expect(rows()).toHaveLength(50);
  });

  it('commit writes the real result onto the reserved row', async () => {
    const { service, prisma } = makeService('pro');
    const reservation = await service.reserveOptimizeQuota('user-1');

    await service.commit(reservation, { prompt: 'p', result: { ok: true }, tokensUsed: 7 });

    expect(prisma.aiHistory.update).toHaveBeenCalledWith({
      where: { id: reservation.id },
      data: { prompt: 'p', result: { ok: true }, tokensUsed: 7 },
    });
  });

  it('release gives the slot back so a failed call does not count', async () => {
    const { service, rows } = makeService('pro', 49);
    const reservation = await service.reserveOptimizeQuota('user-1');
    expect(rows()).toHaveLength(50);

    await service.release(reservation);

    expect(rows()).toHaveLength(49);
    await expect(service.reserveOptimizeQuota('user-1')).resolves.toMatchObject({ used: 49 });
  });

  it('release never throws', async () => {
    const { service, prisma } = makeService('pro');
    prisma.aiHistory.deleteMany.mockRejectedValueOnce(new Error('db down'));
    await expect(service.release({ id: 'res-x', used: 0, limit: 50 })).resolves.toBeUndefined();
  });

  it('release never throws, even for non-Error rejections', async () => {
    const { service, prisma } = makeService('pro');
    prisma.aiHistory.deleteMany.mockRejectedValueOnce('connection reset');
    await expect(service.release({ id: 'res-y', used: 0, limit: 50 })).resolves.toBeUndefined();
  });
});

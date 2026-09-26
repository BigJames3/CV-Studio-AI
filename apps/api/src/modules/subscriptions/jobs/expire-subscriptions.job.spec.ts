import { ExpireSubscriptionsJob } from './expire-subscriptions.job';

const NOW = new Date('2026-09-26T12:00:00Z');
const DAY = 24 * 60 * 60 * 1000;

function candidate(id: string, tier: string, status: string, endOffsetDays: number) {
  return {
    id,
    subscriptionTier: tier,
    subscriptionEndDate: null,
    subscription: {
      status,
      currentPeriodStart: new Date(NOW.getTime() + (endOffsetDays - 30) * DAY),
      currentPeriodEnd: new Date(NOW.getTime() + endOffsetDays * DAY),
    },
  };
}

describe('ExpireSubscriptionsJob', () => {
  const prisma = {
    user: { findMany: jest.fn(), updateMany: jest.fn() },
  };
  let job: ExpireSubscriptionsJob;

  beforeEach(() => {
    jest.clearAllMocks();
    job = new ExpireSubscriptionsJob(prisma as never);
    prisma.user.updateMany.mockImplementation(async ({ where }) => ({
      count: where.id.in.length,
    }));
  });

  it('downgrades only users whose effective tier is free', async () => {
    prisma.user.findMany.mockResolvedValueOnce([
      candidate('expired-cinetpay', 'pro', 'active', -10),
      candidate('canceled', 'business', 'canceled', 5),
      candidate('past-due-in-grace', 'pro', 'past_due', -2),
      candidate('late-webhook-in-grace', 'business', 'active', -1),
    ]);

    await expect(job.downgradeExpired(NOW)).resolves.toEqual({ count: 2 });

    expect(prisma.user.updateMany).toHaveBeenCalledTimes(1);
    expect(prisma.user.updateMany).toHaveBeenCalledWith({
      where: {
        id: { in: ['expired-cinetpay', 'canceled'] },
        subscriptionTier: { in: ['pro', 'business'] },
      },
      data: { subscriptionTier: 'free' },
    });
  });

  it('only queries paid, non-deleted users', async () => {
    prisma.user.findMany.mockResolvedValueOnce([]);
    await job.downgradeExpired(NOW);
    const where = prisma.user.findMany.mock.calls[0][0].where;
    expect(where.subscriptionTier).toEqual({ in: ['pro', 'business'] });
    expect(where.deletedAt).toBeNull();
  });

  it('does nothing when there is no candidate', async () => {
    prisma.user.findMany.mockResolvedValueOnce([]);
    await expect(job.downgradeExpired(NOW)).resolves.toEqual({ count: 0 });
    expect(prisma.user.updateMany).not.toHaveBeenCalled();
  });

  it('pages through candidates in batches', async () => {
    const fullBatch = Array.from({ length: 500 }, (_, i) =>
      candidate(`u${String(i).padStart(3, '0')}`, 'pro', 'active', -10)
    );
    prisma.user.findMany
      .mockResolvedValueOnce(fullBatch)
      .mockResolvedValueOnce([candidate('u500', 'pro', 'canceled', 3)]);

    await expect(job.downgradeExpired(NOW)).resolves.toEqual({ count: 501 });

    expect(prisma.user.findMany).toHaveBeenCalledTimes(2);
    expect(prisma.user.findMany.mock.calls[1][0]).toMatchObject({
      cursor: { id: 'u499' },
      skip: 1,
    });
  });
});

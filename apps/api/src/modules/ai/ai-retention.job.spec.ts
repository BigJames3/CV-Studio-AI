import { AiRetentionJob, DEFAULT_AI_HISTORY_TTL_DAYS } from './ai-retention.job';

describe('AiRetentionJob', () => {
  const prev = process.env.AI_HISTORY_TTL_DAYS;

  afterEach(() => {
    if (prev === undefined) delete process.env.AI_HISTORY_TTL_DAYS;
    else process.env.AI_HISTORY_TTL_DAYS = prev;
  });

  it('deletes AiHistory older than the TTL', async () => {
    const prisma = {
      aiHistory: { deleteMany: jest.fn().mockResolvedValue({ count: 4 }) },
    };
    process.env.AI_HISTORY_TTL_DAYS = '7';
    const job = new AiRetentionJob(prisma as never);
    const result = await job.purgeExpired();
    expect(result).toEqual({ deleted: 4, ttlDays: 7 });
    expect(prisma.aiHistory.deleteMany).toHaveBeenCalledWith({
      where: { createdAt: { lt: expect.any(Date) } },
    });
  });

  it('falls back to default TTL', () => {
    delete process.env.AI_HISTORY_TTL_DAYS;
    const job = new AiRetentionJob({} as never);
    expect(job.ttlDays()).toBe(DEFAULT_AI_HISTORY_TTL_DAYS);
  });
});

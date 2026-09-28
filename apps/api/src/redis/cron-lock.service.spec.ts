import { CronLockService } from './cron-lock.service';
import type { RedisService } from './redis.module';

describe('CronLockService', () => {
  const setNx = jest.fn();
  const service = new CronLockService({ setNx } as unknown as RedisService);

  beforeEach(() => setNx.mockReset());

  it('runs the job on the replica that takes the lock', async () => {
    setNx.mockResolvedValue(true);
    const job = jest.fn().mockResolvedValue(3);

    await expect(service.runExclusive('seller-payouts', 3600, job)).resolves.toEqual({
      ran: true,
      result: 3,
    });
    expect(setNx).toHaveBeenCalledWith('cron-lock:seller-payouts', expect.any(String), 3600);
    expect(job).toHaveBeenCalledTimes(1);
  });

  it('skips the job when another replica holds the lock', async () => {
    setNx.mockResolvedValue(false);
    const job = jest.fn();

    await expect(service.runExclusive('seller-payouts', 3600, job)).resolves.toEqual({
      ran: false,
    });
    expect(job).not.toHaveBeenCalled();
  });

  it('skips the job when Redis is unavailable (fail closed)', async () => {
    setNx.mockRejectedValue(new Error('ECONNREFUSED'));
    const job = jest.fn();

    await expect(service.runExclusive('seller-payouts', 3600, job)).resolves.toEqual({
      ran: false,
    });
    expect(job).not.toHaveBeenCalled();
  });

  it('lets the job error propagate to the caller', async () => {
    setNx.mockResolvedValue(true);
    await expect(
      service.runExclusive('x', 60, () => Promise.reject(new Error('boom')))
    ).rejects.toThrow('boom');
  });
});

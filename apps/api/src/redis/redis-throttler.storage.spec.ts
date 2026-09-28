import type { ThrottlerStorage } from '@nestjs/throttler';
import { RedisThrottlerStorage } from './redis-throttler.storage';
import type { RedisService } from './redis.module';

function redisWith(status: string, evalImpl?: jest.Mock) {
  return {
    client: { status, eval: evalImpl ?? jest.fn() },
  } as unknown as RedisService;
}

const fallbackRecord = { totalHits: 1, timeToExpire: 60, isBlocked: false, timeToBlockExpire: 0 };

describe('RedisThrottlerStorage', () => {
  let fallback: jest.Mocked<ThrottlerStorage>;

  beforeEach(() => {
    fallback = { increment: jest.fn().mockResolvedValue(fallbackRecord) };
  });

  it('counts in Redis and converts milliseconds to seconds', async () => {
    const evalMock = jest.fn().mockResolvedValue([3, 59_001, 0, 0]);
    const storage = new RedisThrottlerStorage(redisWith('ready', evalMock), fallback);

    await expect(storage.increment('abc', 60_000, 120, 60_000, 'default')).resolves.toEqual({
      totalHits: 3,
      timeToExpire: 60,
      isBlocked: false,
      timeToBlockExpire: 0,
    });
    expect(evalMock).toHaveBeenCalledWith(
      expect.any(String),
      2,
      'rl:throttle:default:abc',
      'rl:throttle:default:abc:block',
      '60000',
      '120',
      '60000'
    );
    expect(fallback.increment).not.toHaveBeenCalled();
  });

  it('reports a block with its remaining time', async () => {
    const evalMock = jest.fn().mockResolvedValue([121, 30_000, 1, 45_500]);
    const storage = new RedisThrottlerStorage(redisWith('ready', evalMock), fallback);

    await expect(storage.increment('abc', 60_000, 120, 60_000, 'default')).resolves.toEqual({
      totalHits: 121,
      timeToExpire: 30,
      isBlocked: true,
      timeToBlockExpire: 46,
    });
  });

  it('uses the in-memory fallback without waiting when Redis is not ready', async () => {
    const evalMock = jest.fn();
    const storage = new RedisThrottlerStorage(redisWith('reconnecting', evalMock), fallback);

    await expect(storage.increment('abc', 60_000, 120, 60_000, 'default')).resolves.toBe(
      fallbackRecord
    );
    expect(evalMock).not.toHaveBeenCalled();
    expect(fallback.increment).toHaveBeenCalledWith('abc', 60_000, 120, 60_000, 'default');
  });

  it('falls back when the Redis call fails', async () => {
    const evalMock = jest.fn().mockRejectedValue(new Error('READONLY'));
    const storage = new RedisThrottlerStorage(redisWith('ready', evalMock), fallback);

    await expect(storage.increment('abc', 60_000, 120, 60_000, 'default')).resolves.toBe(
      fallbackRecord
    );
  });
});

import { Logger } from '@nestjs/common';
import { ThrottlerStorage, ThrottlerStorageService } from '@nestjs/throttler';
import type { RedisService } from './redis.module';

/**
 * Fixed window with blocking, atomically in Redis. Returns
 * [totalHits, windowTtlMs, isBlocked (0/1), blockTtlMs].
 * When a key goes over the limit, its window is cleared so a new one starts once the block ends
 * (same behaviour as the in-memory ThrottlerStorageService).
 */
const INCREMENT_SCRIPT = `
local blockTtl = redis.call('PTTL', KEYS[2])
if blockTtl > 0 then
  return {tonumber(ARGV[2]) + 1, blockTtl, 1, blockTtl}
end
local hits = redis.call('INCR', KEYS[1])
local ttl = redis.call('PTTL', KEYS[1])
if ttl < 0 then
  redis.call('PEXPIRE', KEYS[1], ARGV[1])
  ttl = tonumber(ARGV[1])
end
if hits > tonumber(ARGV[2]) then
  redis.call('SET', KEYS[2], '1', 'PX', ARGV[3])
  redis.call('DEL', KEYS[1])
  return {hits, ttl, 1, tonumber(ARGV[3])}
end
return {hits, ttl, 0, 0}
`;

const KEY_PREFIX = 'rl:throttle:';

/**
 * Nest throttler storage shared by every API replica, so the global limit is per client and not
 * per pod. If Redis is not ready or a call fails, it falls back to the in-memory storage (per pod)
 * instead of failing or delaying requests.
 */
export class RedisThrottlerStorage implements ThrottlerStorage {
  private readonly logger = new Logger(RedisThrottlerStorage.name);
  private lastWarnAt = 0;

  constructor(
    private readonly redis: RedisService,
    private readonly fallback: ThrottlerStorage = new ThrottlerStorageService()
  ) {}

  async increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
    throttlerName: string
  ): ReturnType<ThrottlerStorage['increment']> {
    if (this.redis.client.status !== 'ready') {
      return this.fallback.increment(key, ttl, limit, blockDuration, throttlerName);
    }
    const base = `${KEY_PREFIX}${throttlerName}:${key}`;
    try {
      const [totalHits, windowMs, blocked, blockMs] = (await this.redis.client.eval(
        INCREMENT_SCRIPT,
        2,
        base,
        `${base}:block`,
        String(ttl),
        String(limit),
        String(blockDuration)
      )) as [number, number, number, number];
      return {
        totalHits,
        timeToExpire: Math.ceil(windowMs / 1000),
        isBlocked: blocked === 1,
        timeToBlockExpire: Math.ceil(blockMs / 1000),
      };
    } catch (error) {
      const now = Date.now();
      if (now - this.lastWarnAt > 60_000) {
        this.lastWarnAt = now;
        this.logger.warn(
          `Redis throttler unavailable, using per-pod memory: ${(error as Error).message}`
        );
      }
      return this.fallback.increment(key, ttl, limit, blockDuration, throttlerName);
    }
  }
}

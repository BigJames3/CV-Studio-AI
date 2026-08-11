import { HttpException } from '@nestjs/common';
import { AuthRateLimitService } from './auth-rate-limit.service';
import { RedisService } from '../../redis/redis.module';

describe('AuthRateLimitService', () => {
  const redis = {
    connect: jest.fn().mockResolvedValue(undefined),
    incrWithTtl: jest.fn(),
  };

  const service = new AuthRateLimitService(redis as unknown as RedisService);

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.AUTH_RATE_LIMIT_DISABLED = 'false';
    process.env.NODE_ENV = 'development';
  });

  afterEach(() => {
    process.env.AUTH_RATE_LIMIT_DISABLED = 'true';
    process.env.NODE_ENV = 'test';
  });

  it('allows requests under the limit', async () => {
    redis.incrWithTtl.mockResolvedValue(1);
    await expect(service.checkLogin('127.0.0.1', 'a@b.com')).resolves.toBeUndefined();
  });

  it('throws RATE_LIMITED when over limit', async () => {
    redis.incrWithTtl.mockResolvedValue(6);
    await expect(service.checkLogin('127.0.0.1', 'a@b.com')).rejects.toBeInstanceOf(HttpException);
  });

  it('skips when AUTH_RATE_LIMIT_DISABLED=true', async () => {
    process.env.AUTH_RATE_LIMIT_DISABLED = 'true';
    await expect(service.checkLogin('127.0.0.1', 'a@b.com')).resolves.toBeUndefined();
    expect(redis.incrWithTtl).not.toHaveBeenCalled();
  });
});

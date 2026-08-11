import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { RedisService } from '../../redis/redis.module';

@Injectable()
export class AuthRateLimitService {
  constructor(private readonly redis: RedisService) {}

  private async hit(key: string, limit: number, ttlSeconds: number) {
    if (process.env.AUTH_RATE_LIMIT_DISABLED === 'true' || process.env.NODE_ENV === 'test') {
      return;
    }
    await this.redis.connect();
    const count = await this.redis.incrWithTtl(key, ttlSeconds);
    if (count > limit) {
      throw new HttpException(
        {
          code: 'RATE_LIMITED',
          message: 'Too many requests. Please try again later.',
        },
        HttpStatus.TOO_MANY_REQUESTS
      );
    }
  }

  /** 5 attempts / 15 min per IP+email */
  async checkLogin(ip: string, email: string) {
    await this.hit(`rl:login:${ip}:${email.toLowerCase()}`, 5, 15 * 60);
  }

  /** 3 / hour per IP */
  async checkRegister(ip: string) {
    await this.hit(`rl:register:${ip}`, 3, 60 * 60);
  }

  /** 3 / hour per email */
  async checkForgotPassword(email: string) {
    await this.hit(`rl:forgot:${email.toLowerCase()}`, 3, 60 * 60);
  }

  /** 30 / min per IP */
  async checkRefresh(ip: string) {
    await this.hit(`rl:refresh:${ip}`, 30, 60);
  }

  /** 3 / hour per user */
  async checkResendVerification(userId: string) {
    await this.hit(`rl:resend-verify:${userId}`, 3, 60 * 60);
  }
}

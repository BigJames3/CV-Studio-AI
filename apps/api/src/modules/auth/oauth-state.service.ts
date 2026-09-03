import { Injectable, UnauthorizedException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { RedisService } from '../../redis/redis.module';
import { sanitizeNextPath } from './oauth-redirect';

const STATE_TTL_SECONDS = 10 * 60;

type StoredState = {
  nonce: string;
  next: string;
  provider: string;
  timestamp: number;
};

@Injectable()
export class OAuthStateService {
  constructor(private readonly redis: RedisService) {}

  private key(nonce: string) {
    return `oauth:state:${nonce}`;
  }

  async create(provider: string, next?: string): Promise<{ state: string; next: string }> {
    const nonce = randomBytes(32).toString('hex');
    const safeNext = sanitizeNextPath(next);
    const payload: StoredState = {
      nonce,
      next: safeNext,
      provider,
      timestamp: Date.now(),
    };
    await this.redis.connect();
    await this.redis.set(this.key(nonce), JSON.stringify(payload), STATE_TTL_SECONDS);
    return { state: nonce, next: safeNext };
  }

  async consume(state: string | undefined, provider: string): Promise<{ next: string }> {
    if (!state) {
      throw new UnauthorizedException({
        code: 'INVALID_STATE',
        message: 'State validation failed',
      });
    }

    await this.redis.connect();
    const key = this.key(state);
    const raw = await this.redis.get(key);
    await this.redis.del(key);

    if (!raw) {
      throw new UnauthorizedException({
        code: 'INVALID_STATE',
        message: 'State validation failed',
      });
    }

    let data: StoredState;
    try {
      data = JSON.parse(raw) as StoredState;
    } catch {
      throw new UnauthorizedException({
        code: 'INVALID_STATE',
        message: 'Invalid state cookie',
      });
    }

    if (data.nonce !== state || data.provider !== provider) {
      throw new UnauthorizedException({
        code: 'INVALID_STATE',
        message: 'State validation failed',
      });
    }

    if (Date.now() - data.timestamp > STATE_TTL_SECONDS * 1000) {
      throw new UnauthorizedException({
        code: 'INVALID_STATE',
        message: 'State expired',
      });
    }

    return { next: sanitizeNextPath(data.next) };
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { hostname } from 'node:os';
import { RedisService } from './redis.module';

/**
 * Runs a scheduled job on one API replica only. @nestjs/schedule fires every @Cron on every pod,
 * so without this a job runs once per replica (3 to 20 times). The lock is not released at the
 * end: it expires after `ttlSeconds`, which must be shorter than the job's period, so replicas
 * whose clock fires a little later do not run it again.
 */
@Injectable()
export class CronLockService {
  private readonly logger = new Logger(CronLockService.name);
  private readonly owner = `${hostname()}:${process.pid}`;

  constructor(private readonly redis: RedisService) {}

  async runExclusive<T>(
    job: string,
    ttlSeconds: number,
    fn: () => Promise<T>
  ): Promise<{ ran: true; result: T } | { ran: false }> {
    let acquired: boolean;
    try {
      acquired = await this.redis.setNx(`cron-lock:${job}`, this.owner, ttlSeconds);
    } catch (error) {
      // Fail closed: skipping one run is safer than running it on every replica.
      this.logger.error(`Skipping ${job}: cron lock unavailable (${(error as Error).message})`);
      return { ran: false };
    }
    if (!acquired) {
      this.logger.debug(`Skipping ${job}: already run by another replica`);
      return { ran: false };
    }
    return { ran: true, result: await fn() };
  }
}

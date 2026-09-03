import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../database/prisma.module';

export const DEFAULT_AI_HISTORY_TTL_DAYS = 7;

@Injectable()
export class AiRetentionJob {
  private readonly logger = new Logger(AiRetentionJob.name);

  constructor(private readonly prisma: PrismaService) {}

  ttlDays(): number {
    const parsed = Number(process.env.AI_HISTORY_TTL_DAYS ?? DEFAULT_AI_HISTORY_TTL_DAYS);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_AI_HISTORY_TTL_DAYS;
  }

  async purgeExpired(): Promise<{ deleted: number; ttlDays: number }> {
    const ttlDays = this.ttlDays();
    const cutoff = new Date(Date.now() - ttlDays * 24 * 60 * 60 * 1000);
    const result = await this.prisma.aiHistory.deleteMany({
      where: { createdAt: { lt: cutoff } },
    });
    if (result.count > 0) {
      this.logger.log(`Purged ${result.count} AiHistory rows older than ${ttlDays}d`);
    }
    return { deleted: result.count, ttlDays };
  }

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async dailyPurge() {
    await this.purgeExpired();
  }
}

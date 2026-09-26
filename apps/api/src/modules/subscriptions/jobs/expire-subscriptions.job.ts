import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../../database/prisma.module';
import { resolveEffectiveTier, TIER_SOURCE_SELECT } from '../effective-tier';

const BATCH_SIZE = 500;

@Injectable()
export class ExpireSubscriptionsJob {
  private readonly logger = new Logger(ExpireSubscriptionsJob.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Every hour: persist `free` on users whose paid tier has lapsed (expired CinetPay period,
   * missed Stripe webhook, canceled/suspended, past_due beyond grace).
   * Entitlements already enforce this at read time; this keeps the stored tier, the JWT
   * claims issued on refresh and the analytics in line. The subscription row is left as is
   * so a late renewal webhook can restore the tier.
   */
  @Cron(CronExpression.EVERY_HOUR)
  async downgradeExpired(now = new Date()): Promise<{ count: number }> {
    let count = 0;
    let cursor: string | undefined;

    for (;;) {
      const users = await this.prisma.user.findMany({
        where: {
          subscriptionTier: { in: ['pro', 'business'] },
          deletedAt: null,
          OR: [
            { subscription: { is: { status: { notIn: ['active', 'trialing'] } } } },
            { subscription: { is: { currentPeriodEnd: { lt: now } } } },
            { subscription: { is: null }, subscriptionEndDate: { lt: now } },
          ],
        },
        select: { id: true, ...TIER_SOURCE_SELECT },
        orderBy: { id: 'asc' },
        take: BATCH_SIZE,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      });
      if (users.length === 0) break;
      cursor = users[users.length - 1].id;

      const expiredIds = users
        .filter((user) => resolveEffectiveTier(user, now) === 'free')
        .map((user) => user.id);
      if (expiredIds.length > 0) {
        const result = await this.prisma.user.updateMany({
          where: { id: { in: expiredIds }, subscriptionTier: { in: ['pro', 'business'] } },
          data: { subscriptionTier: 'free' },
        });
        count += result.count;
      }

      if (users.length < BATCH_SIZE) break;
    }

    if (count > 0) {
      this.logger.log(`Downgraded ${count} users with expired subscriptions to free`);
    }
    return { count };
  }
}

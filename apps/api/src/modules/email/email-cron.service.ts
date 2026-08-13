import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../database/prisma.module';
import { EmailService } from './email.service';

@Injectable()
export class EmailCronService {
  private readonly logger = new Logger(EmailCronService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService
  ) {}

  /**
   * Reminder ~7 days before period end for canceling paid subscriptions.
   * Runs daily at 09:00 server time. Sends once when ceil(daysRemaining) === 7.
   */
  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async sendExpirationReminders() {
    this.logger.log('Starting expiration reminder job...');

    try {
      const today = new Date();
      const sevenDaysFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
      // Narrow window so we only hit users whose end date is ~7 days out
      const sixDaysFromNow = new Date(today.getTime() + 6 * 24 * 60 * 60 * 1000);

      const usersExpiringSoon = await this.prisma.user.findMany({
        where: {
          deletedAt: null,
          subscriptionEndDate: {
            gt: sixDaysFromNow,
            lte: sevenDaysFromNow,
          },
          subscriptionTier: { in: ['pro', 'business'] },
          subscription: {
            is: { cancelAtPeriodEnd: true },
          },
        },
        select: {
          email: true,
          firstName: true,
          lastName: true,
          subscriptionTier: true,
          subscriptionEndDate: true,
        },
      });

      this.logger.log(`Found ${usersExpiringSoon.length} users expiring in ~7 days`);

      for (const user of usersExpiringSoon) {
        if (!user.subscriptionEndDate) continue;

        const daysRemaining = Math.ceil(
          (user.subscriptionEndDate.getTime() - today.getTime()) / (24 * 60 * 60 * 1000)
        );
        if (daysRemaining !== 7) continue;

        const name = [user.firstName, user.lastName].filter(Boolean).join(' ').trim() || 'there';

        await this.emailService.sendExpirationReminderEmail(
          user.email,
          name,
          user.subscriptionTier,
          user.subscriptionEndDate,
          daysRemaining
        );
      }

      this.logger.log('Expiration reminder job completed');
    } catch (error) {
      this.logger.error('Error in expiration reminder job', error as Error);
    }
  }
}

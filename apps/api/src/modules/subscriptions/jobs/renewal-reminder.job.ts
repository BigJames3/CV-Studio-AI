import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../../database/prisma.module';
import { MailService } from '../../../mail/mail.service';

/** How long before the end of a prepaid period the user is reminded to renew. */
export const RENEWAL_REMINDER_DAYS = 7;
const BATCH_SIZE = 200;

@Injectable()
export class RenewalReminderJob {
  private readonly logger = new Logger(RenewalReminderJob.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService
  ) {}

  /**
   * Every day at 08:00 UTC: prepaid plans do not renew by themselves (Paystack has no
   * recurring billing here), so each period gets one "your plan ends soon" e-mail. The row is
   * claimed before sending, so two pods never send it twice.
   */
  @Cron('0 8 * * *')
  async sendReminders(now = new Date()): Promise<{ sent: number }> {
    const horizon = new Date(now.getTime() + RENEWAL_REMINDER_DAYS * 24 * 60 * 60 * 1000);
    const due = await this.prisma.subscription.findMany({
      where: {
        provider: 'paystack',
        status: 'active',
        renewalReminderSentAt: null,
        currentPeriodEnd: { gt: now, lte: horizon },
        user: { deletedAt: null, subscriptionTier: { in: ['pro', 'business'] } },
      },
      select: {
        id: true,
        currentPeriodEnd: true,
        plan: { select: { name: true } },
        user: { select: { email: true } },
      },
      take: BATCH_SIZE,
    });

    let sent = 0;
    for (const sub of due) {
      const claimed = await this.prisma.subscription.updateMany({
        where: { id: sub.id, renewalReminderSentAt: null },
        data: { renewalReminderSentAt: now },
      });
      if (claimed.count === 0) continue;
      await this.mail.sendRenewalReminder(sub.user.email, {
        plan: sub.plan.name,
        endsAt: sub.currentPeriodEnd,
      });
      sent++;
    }
    if (sent > 0) this.logger.log(`Sent ${sent} renewal reminder(s)`);
    return { sent };
  }
}

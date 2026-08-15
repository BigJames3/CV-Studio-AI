import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PaymentsService } from '../payments.service';

@Injectable()
export class ExpirePendingPaymentsJob {
  private readonly logger = new Logger(ExpirePendingPaymentsJob.name);

  constructor(private readonly payments: PaymentsService) {}

  /** Every hour: mark payments still pending after 60 minutes as failed. */
  @Cron(CronExpression.EVERY_HOUR)
  async expirePendingPayments() {
    const result = await this.payments.expireStalePending();
    if (result.count > 0) {
      this.logger.log(`Expired ${result.count} pending payments`);
    }
  }

  /** Daily 09:00 — renewal emails (v2). */
  @Cron('0 9 * * *')
  async sendRenewalReminders() {
    this.logger.debug('Renewal reminder job skipped (v2)');
  }
}

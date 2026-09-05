import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { MailService } from '../../../mail/mail.service';
import { MarketplaceService } from '../marketplace.service';

@Injectable()
export class SellerPayoutsJob {
  private readonly logger = new Logger(SellerPayoutsJob.name);

  constructor(
    private readonly marketplace: MarketplaceService,
    private readonly mail: MailService
  ) {}

  /** Wednesday 09:00 UTC — weekly Connect transfers for platform-held earnings. */
  @Cron('0 9 * * 3')
  async runWeeklyPayouts() {
    try {
      const result = await this.marketplace.processWeeklyPayouts();
      if (result.paidCount === 0) {
        this.logger.debug('Weekly marketplace payouts: nothing due');
        return;
      }
      this.logger.log(`Weekly marketplace payouts: ${result.paidCount} transfer(s)`);
      await Promise.all(
        result.payouts.map((p) =>
          this.mail.send({
            to: p.email,
            subject: 'CV Studio AI — seller payout',
            text: `We sent ${(p.amountCents / 100).toFixed(2)} USD to your connected account (${p.transferId}).`,
            html: `<p>We sent <strong>${(p.amountCents / 100).toFixed(2)} USD</strong> to your connected payout account.</p><p>Transfer ${p.transferId}</p>`,
          })
        )
      );
    } catch (err) {
      this.logger.error(
        'Weekly marketplace payouts failed',
        err instanceof Error ? err.stack : String(err)
      );
    }
  }
}

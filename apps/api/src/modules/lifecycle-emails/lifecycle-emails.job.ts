import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { CronLockService } from '../../redis/cron-lock.service';
import { LifecycleEmailsService } from './lifecycle-emails.service';

@Injectable()
export class LifecycleEmailsJob {
  constructor(
    private readonly emails: LifecycleEmailsService,
    private readonly cronLock: CronLockService
  ) {}

  /** 09:00 UTC: morning in West Africa (UTC+0/+1) and France (UTC+1/+2). One pod runs it. */
  @Cron('0 9 * * *', { timeZone: 'UTC' })
  async daily() {
    await this.cronLock.runExclusive('lifecycle-emails', 23 * 60 * 60, () =>
      this.emails.runDaily()
    );
  }
}

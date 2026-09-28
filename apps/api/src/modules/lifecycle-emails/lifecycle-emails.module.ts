import { Module } from '@nestjs/common';
import { LifecycleEmailsController } from './lifecycle-emails.controller';
import { LifecycleEmailsJob } from './lifecycle-emails.job';
import { LifecycleEmailsService } from './lifecycle-emails.service';

@Module({
  controllers: [LifecycleEmailsController],
  providers: [LifecycleEmailsService, LifecycleEmailsJob],
  exports: [LifecycleEmailsService],
})
export class LifecycleEmailsModule {}

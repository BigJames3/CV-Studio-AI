import { Global, Module } from '@nestjs/common';
import { EmailService } from './email.service';
import { EmailCronService } from './email-cron.service';

@Global()
@Module({
  providers: [EmailService, EmailCronService],
  exports: [EmailService],
})
export class EmailModule {}

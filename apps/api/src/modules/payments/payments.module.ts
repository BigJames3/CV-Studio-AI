import { Module, forwardRef } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { StripeWebhookStoreService } from './stripe-webhook-store.service';
import { StripeAlertService } from './stripe-alert.service';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { MailModule } from '../../mail/mail.module';

@Module({
  imports: [forwardRef(() => SubscriptionsModule), MailModule],
  controllers: [PaymentsController],
  providers: [PaymentsService, StripeWebhookStoreService, StripeAlertService],
  exports: [PaymentsService],
})
export class PaymentsModule {}

import { Module, forwardRef } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { StripeWebhookStoreService } from './stripe-webhook-store.service';
import { StripeAlertService } from './stripe-alert.service';
import { CinetpayGateway } from './gateways/cinetpay.gateway';
import { ExpirePendingPaymentsJob } from './jobs/expire-pending-payments.job';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';

@Module({
  imports: [forwardRef(() => SubscriptionsModule)],
  controllers: [PaymentsController],
  providers: [
    PaymentsService,
    StripeWebhookStoreService,
    StripeAlertService,
    CinetpayGateway,
    ExpirePendingPaymentsJob,
  ],
  exports: [PaymentsService, CinetpayGateway],
})
export class PaymentsModule {}

import { Module, forwardRef } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { PaymentWebhookStoreService } from './payment-webhook-store.service';
import { PaymentAlertService } from './payment-alert.service';
import { PaystackModule } from './paystack.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { MarketplaceModule } from '../marketplace/marketplace.module';

@Module({
  imports: [
    PaystackModule,
    forwardRef(() => SubscriptionsModule),
    forwardRef(() => MarketplaceModule),
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService, PaymentWebhookStoreService, PaymentAlertService],
  exports: [PaymentsService],
})
export class PaymentsModule {}

import { Module, forwardRef } from '@nestjs/common';
import { SubscriptionsController } from './subscriptions.controller';
import { SubscriptionsService } from './subscriptions.service';
import { EntitlementsService } from './entitlements.service';
import { ExpireSubscriptionsJob } from './jobs/expire-subscriptions.job';
import { RenewalReminderJob } from './jobs/renewal-reminder.job';
import { PaymentsModule } from '../payments/payments.module';
import { PaystackModule } from '../payments/paystack.module';
import { FeatureGateModule } from '../../common/feature-gate.module';

@Module({
  imports: [FeatureGateModule, PaystackModule, forwardRef(() => PaymentsModule)],
  controllers: [SubscriptionsController],
  providers: [
    SubscriptionsService,
    EntitlementsService,
    ExpireSubscriptionsJob,
    RenewalReminderJob,
  ],
  exports: [SubscriptionsService, EntitlementsService],
})
export class SubscriptionsModule {}

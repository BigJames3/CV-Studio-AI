import { Module, forwardRef } from '@nestjs/common';
import { SubscriptionsController } from './subscriptions.controller';
import { SubscriptionsService } from './subscriptions.service';
import { EntitlementsService } from './entitlements.service';
import { PaymentsModule } from '../payments/payments.module';
import { FeatureGateModule } from '../../common/feature-gate.module';

@Module({
  imports: [FeatureGateModule, forwardRef(() => PaymentsModule)],
  controllers: [SubscriptionsController],
  providers: [SubscriptionsService, EntitlementsService],
  exports: [SubscriptionsService, EntitlementsService],
})
export class SubscriptionsModule {}

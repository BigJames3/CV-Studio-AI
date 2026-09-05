import { Module, forwardRef } from '@nestjs/common';
import { MarketplaceController } from './marketplace.controller';
import { MarketplaceService } from './marketplace.service';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { EntitlementsGuard } from '../../common/guards/entitlements.guard';
import { SellerPayoutsJob } from './jobs/seller-payouts.job';

@Module({
  imports: [forwardRef(() => SubscriptionsModule)],
  controllers: [MarketplaceController],
  providers: [MarketplaceService, EntitlementsGuard, SellerPayoutsJob],
  exports: [MarketplaceService],
})
export class MarketplaceModule {}

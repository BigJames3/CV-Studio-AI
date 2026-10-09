import { Module, forwardRef } from '@nestjs/common';
import { MarketplaceController } from './marketplace.controller';
import { MarketplaceService } from './marketplace.service';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { EntitlementsGuard } from '../../common/guards/entitlements.guard';
import { SellerPayoutsJob } from './jobs/seller-payouts.job';
import { MarketplaceModerationController } from './marketplace-moderation.controller';
import { MarketplaceModerationService } from './marketplace-moderation.service';
import { MarketplaceModeratorGuard } from './marketplace-moderator.guard';

@Module({
  imports: [forwardRef(() => SubscriptionsModule)],
  controllers: [MarketplaceController, MarketplaceModerationController],
  providers: [
    MarketplaceService,
    MarketplaceModerationService,
    MarketplaceModeratorGuard,
    EntitlementsGuard,
    SellerPayoutsJob,
  ],
  exports: [MarketplaceService],
})
export class MarketplaceModule {}

import { Module, forwardRef } from '@nestjs/common';
import { MarketplaceController } from './marketplace.controller';
import { MarketplaceService } from './marketplace.service';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { EntitlementsGuard } from '../../common/guards/entitlements.guard';
import { PaystackModule } from '../payments/paystack.module';
import { MarketplaceModerationController } from './marketplace-moderation.controller';
import { MarketplaceModerationService } from './marketplace-moderation.service';
import { MarketplaceModeratorGuard } from './marketplace-moderator.guard';
import { MarketplaceCatalogService } from './marketplace-catalog.service';

@Module({
  imports: [PaystackModule, forwardRef(() => SubscriptionsModule)],
  controllers: [MarketplaceController, MarketplaceModerationController],
  providers: [
    MarketplaceService,
    MarketplaceModerationService,
    MarketplaceCatalogService,
    MarketplaceModeratorGuard,
    EntitlementsGuard,
  ],
  exports: [MarketplaceService],
})
export class MarketplaceModule {}

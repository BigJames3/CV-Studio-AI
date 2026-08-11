import { Module } from '@nestjs/common';
import { MarketplaceController } from './marketplace.controller';
import { MarketplaceService } from './marketplace.service';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { EntitlementsGuard } from '../../common/guards/entitlements.guard';

@Module({
  imports: [SubscriptionsModule],
  controllers: [MarketplaceController],
  providers: [MarketplaceService, EntitlementsGuard],
})
export class MarketplaceModule {}

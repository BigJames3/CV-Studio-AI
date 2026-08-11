import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { AiQuotaService } from './ai-quota.service';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { EntitlementsGuard } from '../../common/guards/entitlements.guard';

@Module({
  imports: [SubscriptionsModule],
  controllers: [AiController],
  providers: [AiService, AiQuotaService, EntitlementsGuard],
})
export class AiModule {}

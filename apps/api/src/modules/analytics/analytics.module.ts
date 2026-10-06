import { Module } from '@nestjs/common';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { CvAnalyticsService } from './cv-analytics.service';
import { PublicCvViewsController } from './public-cv-views.controller';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';

@Module({
  imports: [SubscriptionsModule],
  controllers: [AnalyticsController, PublicCvViewsController],
  providers: [AnalyticsService, CvAnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}

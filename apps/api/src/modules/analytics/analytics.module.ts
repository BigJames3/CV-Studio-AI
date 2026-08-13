import { Global, Module } from '@nestjs/common';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { AnalyticsEventsService } from './analytics-events.service';

@Global()
@Module({
  controllers: [AnalyticsController],
  providers: [AnalyticsService, AnalyticsEventsService],
  exports: [AnalyticsService, AnalyticsEventsService],
})
export class AnalyticsModule {}

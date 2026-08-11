import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, AuthUser } from '../../common/decorators';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { AnalyticsService } from './analytics.service';
import { TrackEventDto } from './dto/track-event.dto';

@ApiTags('Analytics')
@ApiBearerAuth('JWT')
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Get('dashboard')
  dashboard(@CurrentUser() user: AuthUser) {
    return this.analytics.dashboard(user.id);
  }

  @Get('events')
  events(@CurrentUser() user: AuthUser, @Query() query: PaginationQueryDto) {
    return this.analytics.events(user.id, query);
  }

  @Post('track')
  track(@CurrentUser() user: AuthUser, @Body() dto: TrackEventDto) {
    return this.analytics.track(user.id, {
      event: dto.event,
      properties: dto.properties,
      sessionId: dto.sessionId,
      platform: dto.platform,
    });
  }
}

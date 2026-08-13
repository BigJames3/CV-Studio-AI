import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, AuthUser } from '../../common/decorators';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { AdminGuard } from '../../common/guards/admin.guard';
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

  @Get('metrics')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Platform metrics (admin only)' })
  metrics() {
    return this.analytics.platformMetrics();
  }

  @Get('revenue-history')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Monthly revenue history (admin only)' })
  revenueHistory(@Query('months') months?: string) {
    const parsed = months ? Number(months) : 12;
    return this.analytics.revenueHistory(Number.isFinite(parsed) ? parsed : 12);
  }

  @Get('cohort-retention')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Signup cohort retention (admin only)' })
  cohortRetention(@Query('months') months?: string) {
    const parsed = months ? Number(months) : 12;
    return this.analytics.cohortRetention(Number.isFinite(parsed) ? parsed : 12);
  }

  @Get('funnel')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Signup → upgrade funnel (admin only)' })
  funnel() {
    return this.analytics.funnelAnalysis();
  }

  @Get('cac')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Customer acquisition cost (admin only)' })
  cac(@Query('period') period?: 'month' | 'quarter' | 'year') {
    const allowed = period === 'quarter' || period === 'year' ? period : 'month';
    return this.analytics.customerAcquisitionCost(allowed);
  }

  @Get('ltv')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Lifetime value (admin only)' })
  ltv() {
    return this.analytics.lifetimeValue();
  }
}

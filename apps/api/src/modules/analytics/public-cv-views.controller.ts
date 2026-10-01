import { Body, Controller, HttpCode, Param, Post, Req } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { Public } from '../../common/decorators';
import { clientIp } from '../../common/utils/client-ip';
import { CvAnalyticsService } from './cv-analytics.service';
import { RecordCvViewDto } from './dto/cv-view.dto';

@ApiTags('Public CVs')
@Controller('public/cvs')
export class PublicCvViewsController {
  constructor(private readonly analytics: CvAnalyticsService) {}

  /** Sent once by the visitor's browser: the page itself is cached server-side. */
  @Public()
  @Post(':slug/view')
  @HttpCode(200)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @ApiOperation({ summary: 'Record a visit of a public CV (analytics)' })
  record(@Param('slug') slug: string, @Body() dto: RecordCvViewDto, @Req() req: Request) {
    return this.analytics.recordView(
      slug,
      { src: dto.src, referrer: dto.referrer },
      { ip: clientIp(req), userAgent: req.headers['user-agent'] }
    );
  }
}

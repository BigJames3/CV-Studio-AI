import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { ANALYTICS_PERIODS, type AnalyticsPeriod } from '../cv-analytics.service';

export class RecordCvViewDto {
  @ApiPropertyOptional({
    description: '`src` query param of the visited URL (qr, linkedin, email)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  src?: string;

  @ApiPropertyOptional({ description: 'document.referrer; only its host is stored' })
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  referrer?: string;
}

export class CvAnalyticsQueryDto {
  @ApiPropertyOptional({ enum: ANALYTICS_PERIODS, default: 30 })
  @IsOptional()
  @Transform(({ value }) => (value === undefined ? undefined : Number(value)))
  @IsIn(ANALYTICS_PERIODS)
  days?: AnalyticsPeriod;
}

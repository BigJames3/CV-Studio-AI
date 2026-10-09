import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class ModerateListingDto {
  @ApiPropertyOptional({ description: 'Short machine-readable reason, e.g. low_quality, ip_claim' })
  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9_]{2,64}$/)
  reasonCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}

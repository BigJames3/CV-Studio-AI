import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { PRICE_MAX_CENTS, PRICE_MIN_CENTS } from '../commission';

export class CreateListingDto {
  @ApiProperty()
  @IsUUID()
  templateId!: string;

  @ApiProperty()
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  title!: string;

  @ApiProperty()
  @IsString()
  @MinLength(3)
  @MaxLength(140)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'Slug must be lowercase alphanumeric with hyphens',
  })
  slug!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(10_000)
  description?: string;

  @ApiProperty({ minimum: PRICE_MIN_CENTS, maximum: PRICE_MAX_CENTS })
  @IsInt()
  @Min(PRICE_MIN_CENTS)
  @Max(PRICE_MAX_CENTS)
  priceCents!: number;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @MaxLength(40, { each: true })
  tags?: string[];
}

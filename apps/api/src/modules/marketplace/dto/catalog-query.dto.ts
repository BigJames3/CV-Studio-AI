import { ApiPropertyOptional } from '@nestjs/swagger';
import { TemplateCategory } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export const CATALOG_SOURCES = ['all', 'official', 'seller'] as const;
export type CatalogSource = (typeof CATALOG_SOURCES)[number];

export const CATALOG_SORTS = ['popular', 'newest', 'price_low', 'price_high', 'rating'] as const;
export type CatalogSort = (typeof CATALOG_SORTS)[number];

export class CatalogQueryDto {
  @ApiPropertyOptional({ enum: CATALOG_SOURCES, default: 'all' })
  @IsOptional()
  @IsIn(CATALOG_SOURCES)
  source?: CatalogSource;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  q?: string;

  @ApiPropertyOptional({ enum: TemplateCategory })
  @IsOptional()
  @IsEnum(TemplateCategory)
  category?: TemplateCategory;

  @ApiPropertyOptional({ enum: CATALOG_SORTS, default: 'popular' })
  @IsOptional()
  @IsIn(CATALOG_SORTS)
  sort?: CatalogSort;

  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000)
  page?: number;

  @ApiPropertyOptional({ default: 24, minimum: 1, maximum: 48 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(48)
  pageSize?: number;
}

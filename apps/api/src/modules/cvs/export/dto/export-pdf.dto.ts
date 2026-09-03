import {
  IsBoolean,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  MaxLength,
  Allow,
} from 'class-validator';
import { Type } from 'class-transformer';

/** 1 MiB — enough for inlined CSS + a photo, far below the previous 10 MB DoS ceiling. */
export const PDF_HTML_MAX_CHARS = 1_000_000;

export class ExportPdfDto {
  /** Full CV content (editor shape or legacy sections). Required for sync render. */
  @Allow()
  @IsOptional()
  content?: unknown;

  /** Serialized TemplateWrapper HTML (WYSIWYG). Prefer this for design fidelity. */
  @Allow()
  @IsOptional()
  @IsString()
  @MaxLength(PDF_HTML_MAX_CHARS)
  html?: string;

  @IsOptional()
  @IsBoolean()
  wysiwyg?: boolean = false;

  @IsOptional()
  @IsBoolean()
  includeFooter?: boolean = true;

  @IsOptional()
  @IsBoolean()
  includeHeader?: boolean = true;

  @IsOptional()
  @IsIn(['A4', 'Letter'])
  pageSize?: 'A4' | 'Letter' = 'A4';

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(8)
  @Max(25)
  marginMm?: number = 12;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  filename?: string;

  @IsOptional()
  @IsIn(['draft', 'standard', 'high'])
  quality?: 'draft' | 'standard' | 'high' = 'standard';

  @IsOptional()
  @IsString()
  @MaxLength(200)
  siteUrl?: string;
}

export class BatchExportPdfDto {
  @IsOptional()
  @IsBoolean()
  includeFooter?: boolean = true;

  @IsOptional()
  @IsBoolean()
  includeHeader?: boolean = true;

  @IsOptional()
  @IsIn(['A4', 'Letter'])
  pageSize?: 'A4' | 'Letter' = 'A4';

  @IsOptional()
  @IsIn(['draft', 'standard', 'high'])
  quality?: 'draft' | 'standard' | 'high' = 'standard';

  @Allow()
  items!: Array<{ content: unknown; filename?: string }>;
}

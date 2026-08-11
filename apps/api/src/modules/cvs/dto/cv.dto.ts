import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsObject, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class CreateCvDto {
  @ApiProperty({ example: 'CV Product Manager' })
  @IsString()
  @MaxLength(200)
  title!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  templateId?: string;

  @ApiPropertyOptional({ description: 'Initial JSON document' })
  @IsOptional()
  @IsObject()
  content?: Record<string, unknown>;

  @ApiPropertyOptional({ default: 'fr-FR' })
  @IsOptional()
  @IsString()
  locale?: string;
}

export class UpdateCvDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  templateId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  content?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isStarred?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  locale?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  paper?: string;
}

export class PublishCvDto {
  @ApiProperty({ description: 'Make CV publicly reachable' })
  @IsBoolean()
  isPublic!: boolean;

  @ApiPropertyOptional({ description: 'Custom slug; auto if omitted' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  publicUrl?: string;
}

export class ListCvsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  starred?: boolean;
}

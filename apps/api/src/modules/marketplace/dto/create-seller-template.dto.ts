import { ApiProperty } from '@nestjs/swagger';
import { TemplateCategory } from '@prisma/client';
import { IsEnum, IsObject, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateSellerTemplateDto {
  @ApiProperty()
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  name!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  description!: string;

  @ApiProperty({ enum: TemplateCategory })
  @IsEnum(TemplateCategory)
  category!: TemplateCategory;

  @ApiProperty()
  @IsString()
  @MaxLength(2048)
  previewImageUrl!: string;

  @ApiProperty({ type: 'object', additionalProperties: true })
  @IsObject()
  designData!: Record<string, unknown>;
}

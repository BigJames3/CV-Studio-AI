import { Controller, ForbiddenException, Get, Param, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsOptional, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { Public } from '../../common/decorators';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { TemplatesService } from './templates.service';

export enum TemplateCategoryParam {
  modern = 'modern',
  creative = 'creative',
  executive = 'executive',
  startup = 'startup',
  ats_optimized = 'ats_optimized',
}

class ListTemplatesQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  premium?: boolean;
}

@ApiTags('Templates')
@Controller('templates')
export class TemplatesController {
  constructor(private readonly templates: TemplatesService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'List published templates' })
  list(@Query() query: ListTemplatesQueryDto) {
    return this.templates.list(query);
  }

  @Public()
  @Get('category/:category')
  byCategory(@Param('category') category: TemplateCategoryParam) {
    return this.templates.byCategory(category);
  }

  @Post('seed')
  @ApiOperation({ summary: 'Upsert official template seeds (non-production, authenticated)' })
  seed() {
    if (process.env.NODE_ENV === 'production') {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'Template seed is disabled in production',
      });
    }
    return this.templates.ensureSeeded();
  }

  @Public()
  @Get(':id')
  get(@Param('id') id: string) {
    return this.templates.get(id);
  }
}

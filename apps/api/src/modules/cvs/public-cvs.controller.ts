import { Controller, Get, Param, NotFoundException } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CvsService } from './cvs.service';
import { Public } from '../../common/decorators';

@ApiTags('Public CVs')
@Controller('public/cvs')
export class PublicCvsController {
  constructor(private readonly cvs: CvsService) {}

  @Public()
  @Get(':slug')
  @ApiOperation({ summary: 'Get a published CV by public slug' })
  async getBySlug(@Param('slug') slug: string) {
    const cv = await this.cvs.getPublicBySlug(slug);
    if (!cv) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'CV not found' });
    }
    return cv;
  }
}

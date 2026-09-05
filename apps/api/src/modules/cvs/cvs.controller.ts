import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  HttpCode,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CvsService } from './cvs.service';
import { CreateCvDto, UpdateCvDto, PublishCvDto, ListCvsQueryDto } from './dto/cv.dto';
import { CurrentUser, AuthUser, RequireFeature } from '../../common/decorators';
import { FeatureGateService } from '../../common/services/feature-gate.service';
import { FeatureGateGuard } from '../../common/guards/feature-gate.guard';

@ApiTags('CVs')
@ApiBearerAuth('JWT')
@Controller('cvs')
export class CvsController {
  constructor(
    private readonly cvs: CvsService,
    private readonly featureGate: FeatureGateService
  ) {}

  @Get()
  @ApiOperation({ summary: 'List my CVs' })
  list(@CurrentUser() user: AuthUser, @Query() query: ListCvsQueryDto) {
    return this.cvs.list(user.id, query);
  }

  @Post()
  @ApiOperation({ summary: 'Create CV (entitlement-gated)' })
  async create(@CurrentUser() user: AuthUser, @Body() dto: CreateCvDto) {
    const cvCount = await this.cvs.countByUser(user.id);
    if (!this.featureGate.canCreateCV(user, cvCount)) {
      throw new ForbiddenException({
        code: 'ENTITLEMENT_REQUIRED',
        message: 'Free plan: 1 CV max',
        details: { feature: 'cv:create', upgradeUrl: '/pricing' },
      });
    }
    return this.cvs.create(user.id, dto);
  }

  @Get(':id')
  get(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.cvs.get(user.id, id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCvDto
  ) {
    return this.cvs.update(user.id, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.cvs.remove(user.id, id);
  }

  @Post(':id/publish')
  @HttpCode(200)
  publish(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PublishCvDto
  ) {
    return this.cvs.publish(user.id, id, dto);
  }

  @Post(':id/duplicate')
  @HttpCode(201)
  @ApiOperation({ summary: 'Duplicate a CV' })
  duplicate(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.cvs.duplicate(user.id, id);
  }

  @Get(':id/share')
  @UseGuards(FeatureGateGuard)
  @RequireFeature('share')
  @ApiOperation({ summary: 'Public share URL + QR for a CV' })
  share(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.cvs.shareMeta(user.id, id);
  }

  @Get(':id/export/pdf')
  @UseGuards(FeatureGateGuard)
  @RequireFeature('downloadPDF')
  @ApiOperation({ summary: 'Enqueue PDF export (async job)' })
  exportPdf(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Query('filename') filename?: string,
    @Query('pageSize') pageSize?: 'A4' | 'Letter',
    @Query('quality') quality?: 'draft' | 'standard' | 'high'
  ) {
    return this.cvs.exportPdf(user.id, id, { filename, pageSize, quality });
  }

  @Get(':id/export/docx')
  @ApiOperation({ summary: 'DOCX export — coming soon (returns FEATURE_UNAVAILABLE)' })
  exportDocx(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.cvs.exportDocx(user.id, id);
  }

  @Get(':id/versions')
  listVersions(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.cvs.listVersions(user.id, id);
  }

  @Get(':id/versions/:versionId')
  getVersion(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('versionId', ParseUUIDPipe) versionId: string
  ) {
    return this.cvs.getVersion(user.id, id, versionId);
  }

  @Post(':id/versions/:versionId/restore')
  @HttpCode(200)
  restoreVersion(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('versionId', ParseUUIDPipe) versionId: string
  ) {
    return this.cvs.restoreVersion(user.id, id, versionId);
  }
}

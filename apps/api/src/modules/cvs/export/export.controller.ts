import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  StreamableFile,
  HttpException,
  HttpStatus,
  Logger,
  Header,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Public, CurrentUser, AuthUser } from '../../../common/decorators';
import { PdfExportService } from './pdf-export.service';
import { ExportPdfDto, BatchExportPdfDto } from './dto/export-pdf.dto';

@ApiTags('CV Export')
@Controller('cvs')
export class CvExportController {
  private readonly logger = new Logger(CvExportController.name);

  constructor(private readonly exportService: PdfExportService) {}

  @Post('export/pdf')
  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Sync PDF from CV content (local drafts + guests)' })
  async renderPdf(
    @Body() dto: ExportPdfDto,
    @CurrentUser() user?: AuthUser
  ): Promise<StreamableFile> {
    if (!dto.html && !dto.content) {
      throw new HttpException(
        {
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'html or content is required',
          suggestion: 'Send serialized preview HTML (preferred) or CV JSON content',
        },
        HttpStatus.BAD_REQUEST
      );
    }

    if (dto.html && dto.html.length > 10_000_000) {
      throw new HttpException(
        {
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'HTML too large (>10MB)',
          suggestion: 'Reduce photo size or export without large images',
        },
        HttpStatus.BAD_REQUEST
      );
    }

    try {
      const result = await this.exportService.renderFromContent(
        dto.content ?? {},
        {
          html: dto.html,
          wysiwyg: dto.wysiwyg ?? Boolean(dto.html),
          includeFooter: dto.html ? false : (dto.includeFooter ?? true),
          includeHeader: dto.html ? false : (dto.includeHeader ?? true),
          pageSize: dto.pageSize ?? 'A4',
          marginMm: dto.html ? 0 : (dto.marginMm ?? 12),
          filename: dto.filename,
          quality: dto.html ? 'high' : (dto.quality ?? 'standard'),
          siteUrl: dto.siteUrl,
        },
        user?.id
      );

      return new StreamableFile(result.buffer, {
        type: 'application/pdf',
        disposition: `attachment; filename="${result.filename}"`,
        length: result.buffer.length,
      });
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error('PDF render failed', error instanceof Error ? error.stack : error);
      throw new HttpException(
        {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Failed to generate PDF',
          details: error instanceof Error ? error.message : undefined,
          suggestion: 'Please try again or contact support',
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('export/pdf/batch')
  @ApiBearerAuth('JWT')
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @ApiOperation({ summary: 'Batch export multiple template contents as JSON (base64 PDFs)' })
  async batchExport(@CurrentUser() user: AuthUser, @Body() dto: BatchExportPdfDto) {
    const results = await this.exportService.renderBatch(
      dto.items ?? [],
      {
        includeFooter: dto.includeFooter ?? true,
        includeHeader: dto.includeHeader ?? true,
        pageSize: dto.pageSize ?? 'A4',
        quality: dto.quality ?? 'standard',
      },
      user.id
    );
    return {
      items: results.map((r) => ({
        filename: r.filename,
        warnings: r.warnings,
        pdfBase64: r.buffer.toString('base64'),
      })),
    };
  }

  @Get('exports/:jobId')
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Poll async PDF export job status' })
  getExportJob(@Param('jobId') jobId: string) {
    return this.exportService.getJobStatus(jobId);
  }

  @Get('exports/:jobId/download')
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Download completed async PDF export' })
  @Header('Content-Type', 'application/pdf')
  async downloadExport(@Param('jobId') jobId: string): Promise<StreamableFile> {
    const { buffer, filename } = await this.exportService.getJobBuffer(jobId);
    return new StreamableFile(buffer, {
      type: 'application/pdf',
      disposition: `attachment; filename="${filename}"`,
      length: buffer.length,
    });
  }
}

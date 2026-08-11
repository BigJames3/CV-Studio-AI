import {
  Injectable,
  Logger,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { createHash } from 'crypto';
import { RedisService } from '../../../redis/redis.module';
import { PrismaService } from '../../../database/prisma.module';
import { EntitlementsService } from '../../subscriptions/entitlements.service';
import { normalizeCvContent } from './normalize-cv-content';
import { validateCvForExport } from './validate-cv-for-export';
import { buildPdfHtml, suggestFilename } from './pdf-html.builder';
import { PdfGeneratorService } from './pdf-generator.service';
import { optimizeImageForPdf } from './optimize-image';
import type { ExportPdfOptions, PdfCvContent, PdfPageSize } from './pdf-content.types';

const CACHE_TTL_SECONDS = 5 * 60;
const JOB_TTL_SECONDS = 15 * 60;

export type PdfJobStatus = {
  status: 'queued' | 'processing' | 'completed' | 'failed';
  jobId: string;
  filename?: string;
  error?: string;
  downloadUrl?: string;
  warnings?: string[];
  createdAt: string;
  updatedAt: string;
};

@Injectable()
export class PdfExportService {
  private readonly logger = new Logger(PdfExportService.name);
  private readonly memoryJobs = new Map<string, PdfJobStatus & { buffer?: Buffer }>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly entitlements: EntitlementsService,
    private readonly generator: PdfGeneratorService
  ) {}

  async renderFromContent(
    content: unknown,
    options: ExportPdfOptions = {},
    userId?: string
  ): Promise<{ buffer: Buffer; filename: string; warnings: string[] }> {
    if (userId) {
      const allowed = await this.entitlements.can(userId, 'cv:export:pdf');
      if (!allowed) {
        throw new BadRequestException({
          code: 'ENTITLEMENT_REQUIRED',
          message: 'PDF export is not available on your plan',
        });
      }
    }

    // WYSIWYG path: client-serialized TemplateWrapper HTML
    if (options.html?.trim()) {
      if (options.html.length > 10_000_000) {
        throw new BadRequestException({
          code: 'HTML_TOO_LARGE',
          message: 'Serialized CV HTML exceeds size limit (>10MB)',
        });
      }
      const cv = content ? normalizeCvContent(content) : normalizeCvContent({});
      const filename = suggestFilename(
        cv.identity.fullName ? cv : { identity: { fullName: options.filename || 'CV' } },
        options.filename
      );
      const cacheKey = `pdf:wysiwyg:${createHash('sha256').update(options.html).digest('hex').slice(0, 24)}`;
      const cached = await this.readCache(cacheKey);
      if (cached) {
        return { buffer: cached, filename, warnings: [] };
      }
      const buffer = await this.generator.htmlToPdf(options.html, {
        ...options,
        wysiwyg: true,
        includeFooter: false,
        includeHeader: false,
        marginMm: 0,
        quality: 'high',
        filename,
      });
      await this.writeCache(cacheKey, buffer);
      return { buffer, filename, warnings: [] };
    }

    const cv = normalizeCvContent(content);
    const validation = validateCvForExport(cv);
    if (!validation.valid) {
      throw new BadRequestException({
        code: 'VALIDATION_FAILED',
        message: 'CV is incomplete for export',
        details: { errors: validation.errors, warnings: validation.warnings },
        suggestion: 'Add a full name and email, then try again',
      });
    }

    const cacheKey = this.cacheKey(cv, options);
    const cached = await this.readCache(cacheKey);
    if (cached) {
      return {
        buffer: cached,
        filename: suggestFilename(cv, options.filename),
        warnings: validation.warnings,
      };
    }

    if (cv.identity.photoUrl) {
      cv.identity.photoUrl = await optimizeImageForPdf(cv.identity.photoUrl);
    }

    const html = buildPdfHtml(cv, {
      ...options,
      siteUrl: options.siteUrl ?? process.env.APP_URL ?? 'https://cvstudio.ai',
      title: options.filename,
    });

    const buffer = await this.generator.htmlToPdf(html, {
      ...options,
      filename: suggestFilename(cv, options.filename),
      siteUrl: options.siteUrl ?? process.env.APP_URL ?? 'https://cvstudio.ai',
    });

    await this.writeCache(cacheKey, buffer);

    return {
      buffer,
      filename: suggestFilename(cv, options.filename),
      warnings: validation.warnings,
    };
  }

  async enqueueFromCvId(
    userId: string,
    cvId: string,
    options: ExportPdfOptions = {}
  ): Promise<{ status: string; jobId: string; pollUrl: string }> {
    const allowed = await this.entitlements.can(userId, 'cv:export:pdf');
    if (!allowed) {
      throw new BadRequestException({
        code: 'ENTITLEMENT_REQUIRED',
        message: 'PDF export is not available on your plan',
      });
    }

    const cv = await this.prisma.cv.findFirst({ where: { id: cvId, deletedAt: null } });
    if (!cv) throw new NotFoundException({ code: 'NOT_FOUND', message: 'CV not found' });
    if (cv.userId !== userId) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Not your CV' });
    }

    const jobId = `pdf_${cvId}_${Date.now()}`;
    const job: PdfJobStatus = {
      status: 'queued',
      jobId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await this.saveJob(job);

    // Process inline when no dedicated worker is attached (dev-friendly).
    // Production worker reuses processJob via WORKER_KIND=pdf.
    void this.processJob(jobId, cv.content, {
      ...options,
      pageSize: (options.pageSize ?? (cv.paper as PdfPageSize) ?? 'A4') as PdfPageSize,
      filename: options.filename ?? suggestFilename(normalizeCvContent(cv.content), cv.title),
    }).catch((err) => {
      this.logger.error(`Job ${jobId} failed`, err instanceof Error ? err.stack : err);
    });

    return {
      status: 'queued',
      jobId,
      pollUrl: `/api/v1/cvs/exports/${jobId}`,
    };
  }

  async processJob(jobId: string, content: unknown, options: ExportPdfOptions): Promise<void> {
    await this.patchJob(jobId, { status: 'processing' });
    try {
      const result = await this.renderFromContent(content, options);
      await this.patchJob(jobId, {
        status: 'completed',
        filename: result.filename,
        warnings: result.warnings,
        downloadUrl: `/api/v1/cvs/exports/${jobId}/download`,
      });
      const existing = await this.getJob(jobId);
      if (existing) {
        await this.saveJob({ ...existing, buffer: result.buffer } as PdfJobStatus & {
          buffer?: Buffer;
        });
      }
    } catch (error) {
      await this.patchJob(jobId, {
        status: 'failed',
        error: error instanceof Error ? error.message : 'Failed to generate PDF',
      });
      throw error;
    }
  }

  async getJobStatus(jobId: string): Promise<PdfJobStatus> {
    const job = await this.getJob(jobId);
    if (!job) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Export job not found' });
    }
    const { buffer: _b, ...publicJob } = job as PdfJobStatus & { buffer?: Buffer };
    return publicJob;
  }

  async getJobBuffer(jobId: string): Promise<{ buffer: Buffer; filename: string }> {
    const job = await this.getJob(jobId);
    if (!job) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Export job not found' });
    }
    if (job.status !== 'completed' || !(job as { buffer?: Buffer }).buffer) {
      throw new BadRequestException({
        code: 'NOT_READY',
        message: job.status === 'failed' ? job.error ?? 'Export failed' : 'PDF is not ready yet',
      });
    }
    return {
      buffer: (job as { buffer: Buffer }).buffer,
      filename: job.filename ?? 'cv.pdf',
    };
  }

  async renderBatch(
    items: Array<{ content: unknown; filename?: string }>,
    options: ExportPdfOptions = {},
    userId?: string
  ): Promise<Array<{ filename: string; buffer: Buffer; warnings: string[] }>> {
    if (items.length > 5) {
      throw new BadRequestException({
        code: 'BATCH_TOO_LARGE',
        message: 'Batch export is limited to 5 templates at once',
      });
    }
    return Promise.all(
      items.map((item) =>
        this.renderFromContent(item.content, { ...options, filename: item.filename }, userId)
      )
    );
  }

  private cacheKey(cv: PdfCvContent, options: ExportPdfOptions): string {
    const hash = createHash('sha256')
      .update(JSON.stringify({ cv, options }))
      .digest('hex')
      .slice(0, 24);
    return `pdf:cache:${hash}`;
  }

  private async readCache(key: string): Promise<Buffer | null> {
    try {
      const b64 = await this.redis.get(key);
      if (!b64) return null;
      return Buffer.from(b64, 'base64');
    } catch {
      return null;
    }
  }

  private async writeCache(key: string, buffer: Buffer): Promise<void> {
    try {
      await this.redis.set(key, buffer.toString('base64'), CACHE_TTL_SECONDS);
    } catch {
      /* cache is optional */
    }
  }

  private async saveJob(job: PdfJobStatus & { buffer?: Buffer }): Promise<void> {
    this.memoryJobs.set(job.jobId, job);
    try {
      const { buffer, ...rest } = job;
      await this.redis.set(
        `pdf:job:${job.jobId}`,
        JSON.stringify({
          ...rest,
          bufferB64: buffer ? buffer.toString('base64') : undefined,
        }),
        JOB_TTL_SECONDS
      );
    } catch {
      /* memory fallback */
    }
  }

  private async getJob(jobId: string): Promise<(PdfJobStatus & { buffer?: Buffer }) | null> {
    const mem = this.memoryJobs.get(jobId);
    if (mem) return mem;
    try {
      const raw = await this.redis.get(`pdf:job:${jobId}`);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as PdfJobStatus & { bufferB64?: string };
      const job = {
        ...parsed,
        buffer: parsed.bufferB64 ? Buffer.from(parsed.bufferB64, 'base64') : undefined,
      };
      this.memoryJobs.set(jobId, job);
      return job;
    } catch {
      return null;
    }
  }

  private async patchJob(jobId: string, patch: Partial<PdfJobStatus>): Promise<void> {
    const current = (await this.getJob(jobId)) ?? {
      status: 'queued' as const,
      jobId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await this.saveJob({
      ...current,
      ...patch,
      updatedAt: new Date().toISOString(),
    });
  }
}

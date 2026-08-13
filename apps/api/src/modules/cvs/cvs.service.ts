import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.module';
import { EntitlementsService } from '../subscriptions/entitlements.service';
import { CreateCvDto, UpdateCvDto, PublishCvDto, ListCvsQueryDto } from './dto/cv.dto';
import { PdfExportService } from './export/pdf-export.service';
import { EMPTY_CV_CONTENT, normalizeCvContent } from './cv-content.util';
import { AnalyticsEventsService } from '../analytics/analytics-events.service';
import { randomBytes } from 'crypto';

const EMPTY_CONTENT = EMPTY_CV_CONTENT as Prisma.InputJsonValue;

@Injectable()
export class CvsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly entitlements: EntitlementsService,
    private readonly pdfExport: PdfExportService,
    private readonly analyticsEvents: AnalyticsEventsService
  ) {}

  async list(userId: string, query: ListCvsQueryDto) {
    const limit = query.limit ?? 20;
    const cursor = query.cursor;

    // Prisma cursor + skip:1 (stable with updatedAt desc). Avoid id:{gt} which breaks UUID + sort order.
    const items = await this.prisma.cv.findMany({
      where: {
        userId,
        deletedAt: null,
        ...(query.starred !== undefined ? { isStarred: query.starred } : {}),
      },
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      ...(cursor
        ? {
            cursor: { id: cursor },
            skip: 1,
          }
        : {}),
      select: {
        id: true,
        title: true,
        templateId: true,
        isPublic: true,
        publicUrl: true,
        isStarred: true,
        viewCount: true,
        updatedAt: true,
        createdAt: true,
      },
    });

    const hasMore = items.length > limit;
    const data = hasMore ? items.slice(0, limit) : items;
    return {
      items: data,
      nextCursor: hasMore ? (data[data.length - 1]?.id ?? null) : null,
    };
  }

  async create(userId: string, dto: CreateCvDto) {
    const can = await this.entitlements.can(userId, 'cv:create');
    if (!can) {
      throw new ForbiddenException({
        code: 'ENTITLEMENT_REQUIRED',
        message: 'CV limit reached — upgrade to Pro',
        details: { feature: 'cv:create' },
      });
    }

    const cv = await this.prisma.cv.create({
      data: {
        userId,
        title: dto.title,
        templateId: dto.templateId,
        content: (dto.content as Prisma.InputJsonValue | undefined) ?? EMPTY_CONTENT,
        locale: dto.locale ?? 'fr-FR',
      },
    });
    this.analyticsEvents.trackCVCreated(userId, cv.id);
    return cv;
  }

  async get(userId: string, id: string) {
    const cv = await this.prisma.cv.findFirst({ where: { id, deletedAt: null } });
    if (!cv) throw new NotFoundException({ code: 'NOT_FOUND', message: 'CV not found' });
    if (cv.userId !== userId) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Not your CV' });
    }
    return {
      ...cv,
      content: normalizeCvContent(cv.content) as Prisma.JsonValue,
    };
  }

  async update(userId: string, id: string, dto: UpdateCvDto) {
    await this.get(userId, id);
    const content =
      dto.content !== undefined
        ? (normalizeCvContent(dto.content) as Prisma.InputJsonValue)
        : undefined;
    const updated = await this.prisma.cv.update({
      where: { id },
      data: {
        title: dto.title,
        templateId: dto.templateId,
        content,
        isStarred: dto.isStarred,
        locale: dto.locale,
        paper: dto.paper,
      },
    });
    if (dto.isStarred !== undefined) {
      this.analyticsEvents.trackCVStarred(userId, id, dto.isStarred);
    }
    return updated;
  }

  async remove(userId: string, id: string) {
    await this.get(userId, id);
    await this.prisma.cv.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    this.analyticsEvents.trackCVDeleted(userId, id);
    return { deleted: true };
  }

  async publish(userId: string, id: string, dto: PublishCvDto) {
    await this.get(userId, id);
    const slug = dto.publicUrl ?? `cv-${randomBytes(6).toString('hex')}`;
    try {
      return await this.prisma.cv.update({
        where: { id },
        data: {
          isPublic: dto.isPublic,
          publicUrl: dto.isPublic ? slug : null,
        },
      });
    } catch {
      throw new ConflictException({ code: 'SLUG_TAKEN', message: 'publicUrl already in use' });
    }
  }

  async getPublicBySlug(slug: string) {
    const cv = await this.prisma.cv.findFirst({
      where: { publicUrl: slug, isPublic: true, deletedAt: null },
      select: {
        id: true,
        title: true,
        content: true,
        templateId: true,
        publicUrl: true,
        locale: true,
        paper: true,
        updatedAt: true,
      },
    });
    if (!cv) return null;

    await this.prisma.cv.update({
      where: { id: cv.id },
      data: { viewCount: { increment: 1 } },
    });

    return {
      ...cv,
      content: normalizeCvContent(cv.content) as Prisma.JsonValue,
    };
  }

  async duplicate(userId: string, id: string) {
    const source = await this.get(userId, id);
    const can = await this.entitlements.can(userId, 'cv:create');
    if (!can) {
      throw new ForbiddenException({
        code: 'ENTITLEMENT_REQUIRED',
        message: 'CV limit reached — upgrade to Pro',
        details: { feature: 'cv:create' },
      });
    }

    const copy = await this.prisma.cv.create({
      data: {
        userId,
        title: `${source.title} (copie)`,
        templateId: source.templateId,
        content: source.content as Prisma.InputJsonValue,
        locale: source.locale,
        paper: source.paper,
      },
    });
    this.analyticsEvents.trackCVDuplicated(userId, copy.id);
    return copy;
  }

  async shareMeta(userId: string, id: string) {
    const cv = await this.get(userId, id);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
    if (!cv.isPublic || !cv.publicUrl) {
      return {
        isPublic: false,
        publicUrl: null,
        shareUrl: null,
        qrCodeDataUrl: null,
      };
    }
    const shareUrl = `${appUrl}/s/${cv.publicUrl}`;
    const QRCode = await import('qrcode');
    const qrCodeDataUrl = await QRCode.toDataURL(shareUrl, { margin: 1, width: 220 });
    return {
      isPublic: true,
      publicUrl: cv.publicUrl,
      shareUrl,
      qrCodeDataUrl,
    };
  }

  async exportPdf(
    userId: string,
    id: string,
    options: {
      includeFooter?: boolean;
      includeHeader?: boolean;
      pageSize?: 'A4' | 'Letter';
      marginMm?: number;
      filename?: string;
      quality?: 'draft' | 'standard' | 'high';
    } = {}
  ) {
    return this.pdfExport.enqueueFromCvId(userId, id, options);
  }

  async exportDocx(userId: string, id: string) {
    await this.get(userId, id);
    // Étape 13: hide entitlement until real DOCX generator ships
    throw new ForbiddenException({
      code: 'FEATURE_UNAVAILABLE',
      message: 'DOCX export is coming soon. Use PDF export for now.',
    });
  }

  async listVersions(userId: string, id: string) {
    await this.get(userId, id);
    return this.prisma.cvVersion.findMany({
      where: { cvId: id },
      orderBy: { versionNumber: 'desc' },
      select: { id: true, versionNumber: true, label: true, createdAt: true },
    });
  }

  async getVersion(userId: string, cvId: string, versionId: string) {
    await this.get(userId, cvId);
    const version = await this.prisma.cvVersion.findFirst({
      where: { id: versionId, cvId },
    });
    if (!version) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Version not found' });
    return version;
  }

  async restoreVersion(userId: string, cvId: string, versionId: string) {
    const version = await this.getVersion(userId, cvId, versionId);
    const current = await this.get(userId, cvId);

    const last = await this.prisma.cvVersion.findFirst({
      where: { cvId },
      orderBy: { versionNumber: 'desc' },
    });
    const next = (last?.versionNumber ?? 0) + 1;

    await this.prisma.$transaction([
      this.prisma.cvVersion.create({
        data: {
          cvId,
          versionNumber: next,
          content: current.content as object,
          label: 'pre-restore snapshot',
        },
      }),
      this.prisma.cv.update({
        where: { id: cvId },
        data: { content: version.content as object },
      }),
    ]);

    return this.get(userId, cvId);
  }
}

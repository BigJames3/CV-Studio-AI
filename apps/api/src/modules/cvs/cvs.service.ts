import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.module';
import { EntitlementsService } from '../subscriptions/entitlements.service';
import { lockUserScope, USER_LOCK_TX_OPTIONS } from '../../common/utils/user-lock';
import { CreateCvDto, UpdateCvDto, PublishCvDto, ListCvsQueryDto } from './dto/cv.dto';
import { PdfExportService } from './export/pdf-export.service';
import { TeamsService, type CvAccess } from '../teams/teams.service';
import { EMPTY_CV_CONTENT, normalizeCvContent } from './cv-content.util';
import { TEMPLATE_SEEDS } from '../templates/template-seeds';
import { randomBytes } from 'crypto';

const EMPTY_CONTENT = EMPTY_CV_CONTENT as Prisma.InputJsonValue;
const CV_CREATE_LIMIT_MESSAGE = 'CV creation limit reached for your plan';
const PREMIUM_TEMPLATE_MESSAGE = 'This template requires a Pro or Business plan';

/** Editor keys (`content.templateKey`) of the premium official templates, e.g. `executive`. */
const PREMIUM_TEMPLATE_KEYS: ReadonlySet<string> = new Set(
  TEMPLATE_SEEDS.filter((t) => t.isPremium).map((t) => String(t.designData.key))
);

function contentTemplateKey(content: unknown): string | undefined {
  return normalizeCvContent(content).templateKey;
}

@Injectable()
export class CvsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly entitlements: EntitlementsService,
    private readonly pdfExport: PdfExportService,
    private readonly teams: TeamsService
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
        teamId: true,
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
    await this.assertTemplateAccess(userId, dto.templateId);
    await this.assertTemplateKeyAccess(userId, contentTemplateKey(dto.content));

    return this.createWithinQuota(userId, {
      userId,
      title: dto.title,
      templateId: dto.templateId,
      content: (dto.content as Prisma.InputJsonValue | undefined) ?? EMPTY_CONTENT,
      locale: dto.locale ?? 'fr-FR',
    });
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

  /** CVs other people shared with the caller's active teams, newest first. */
  async listShared(userId: string) {
    const memberships = await this.teams.activeMemberships(userId);
    if (memberships.length === 0) return { items: [] };
    const byTeam = new Map(memberships.map((m) => [m.teamId, m]));
    const cvs = await this.prisma.cv.findMany({
      where: {
        teamId: { in: [...byTeam.keys()] },
        userId: { not: userId },
        deletedAt: null,
      },
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
      take: 200,
      select: {
        id: true,
        title: true,
        templateId: true,
        teamId: true,
        updatedAt: true,
        user: { select: { firstName: true, lastName: true } },
      },
    });
    return {
      items: cvs.map(({ user, ...cv }) => {
        const team = byTeam.get(cv.teamId as string)!;
        return {
          ...cv,
          ownerName: `${user.firstName} ${user.lastName}`.trim(),
          teamName: team.teamName,
          access: team.access,
        };
      }),
    };
  }

  /**
   * A CV the caller may open: their own, or one shared with an active team they belong to.
   * `edit` rejects team viewers. Owner-only actions (delete, publish, share...) use `get`.
   */
  async getAccessible(userId: string, id: string, need: 'read' | 'edit' = 'read') {
    const cv = await this.prisma.cv.findFirst({ where: { id, deletedAt: null } });
    if (!cv) throw new NotFoundException({ code: 'NOT_FOUND', message: 'CV not found' });
    const access: CvAccess | null =
      cv.userId === userId ? 'owner' : await this.teams.cvAccess(userId, cv);
    if (!access) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Not your CV' });
    }
    if (need === 'edit' && access === 'viewer') {
      throw new ForbiddenException({ code: 'READ_ONLY', message: 'You can only view this CV' });
    }
    return {
      ...cv,
      content: normalizeCvContent(cv.content) as Prisma.JsonValue,
      access,
    };
  }

  /** Share a CV with one of the owner's teams, or stop sharing it (`teamId: null`). */
  async setTeam(userId: string, id: string, teamId: string | null) {
    await this.get(userId, id);
    if (teamId) await this.teams.assertCanShareInto(userId, teamId);
    return this.prisma.cv.update({
      where: { id },
      data: { teamId },
      select: { id: true, teamId: true },
    });
  }

  async update(userId: string, id: string, dto: UpdateCvDto) {
    const cv = await this.getAccessible(userId, id, 'edit');
    // Premium templates follow the CV owner's plan, whoever edits.
    await this.assertTemplateAccess(cv.userId, dto.templateId);
    if (dto.content !== undefined) {
      // The editor switches template through content.templateKey, not templateId. A CV that
      // already uses a premium template (e.g. after a downgrade) stays editable.
      const nextKey = contentTemplateKey(dto.content);
      if (nextKey !== contentTemplateKey(cv.content)) {
        await this.assertTemplateKeyAccess(cv.userId, nextKey);
      }
    }
    const content =
      dto.content !== undefined
        ? (normalizeCvContent(dto.content) as Prisma.InputJsonValue)
        : undefined;
    return this.prisma.cv.update({
      where: { id },
      data: {
        title: dto.title,
        templateId: dto.templateId,
        content,
        // Starring is the owner's own bookmark.
        isStarred: cv.access === 'owner' ? dto.isStarred : undefined,
        locale: dto.locale,
        paper: dto.paper,
      },
    });
  }

  async remove(userId: string, id: string) {
    await this.get(userId, id);
    await this.prisma.cv.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return { deleted: true };
  }

  async publish(userId: string, id: string, dto: PublishCvDto) {
    await this.get(userId, id);
    if (dto.isPublic) {
      await this.entitlements.assertCan(userId, 'cv:share', 'Sharing requires Pro');
    }
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
    // Views are counted by POST /public/cvs/:slug/view from the visitor's browser: this read
    // is cached by the web page, so counting here missed most visits.
    if (!cv) return null;

    return {
      ...cv,
      content: normalizeCvContent(cv.content) as Prisma.JsonValue,
    };
  }

  async duplicate(userId: string, id: string) {
    const source = await this.get(userId, id);

    return this.createWithinQuota(userId, {
      userId,
      title: `${source.title} (copie)`,
      templateId: source.templateId,
      content: source.content as Prisma.InputJsonValue,
      locale: source.locale,
      paper: source.paper,
    });
  }

  /**
   * Count-then-create under a per-user lock, so parallel requests cannot all pass the
   * quota check before any of them has written (e.g. 10 simultaneous creates on FREE).
   */
  private createWithinQuota(userId: string, data: Prisma.CvUncheckedCreateInput) {
    return this.prisma.$transaction(async (tx) => {
      await lockUserScope(tx, userId, 'cv:create');
      await this.entitlements.assertCan(userId, 'cv:create', CV_CREATE_LIMIT_MESSAGE, tx);
      return tx.cv.create({ data });
    }, USER_LOCK_TX_OPTIONS);
  }

  async shareMeta(userId: string, id: string) {
    await this.entitlements.assertCan(userId, 'cv:share', 'Sharing requires Pro');
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
    // `src=qr` lets analytics tell QR scans from shared links.
    const qrCodeDataUrl = await QRCode.toDataURL(`${shareUrl}?src=qr`, { margin: 1, width: 220 });
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
    await this.getAccessible(userId, id);
    return this.prisma.cvVersion.findMany({
      where: { cvId: id },
      orderBy: { versionNumber: 'desc' },
      select: { id: true, versionNumber: true, label: true, createdAt: true },
    });
  }

  async getVersion(userId: string, cvId: string, versionId: string) {
    await this.getAccessible(userId, cvId);
    const version = await this.prisma.cvVersion.findFirst({
      where: { id: versionId, cvId },
    });
    if (!version) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Version not found' });
    return version;
  }

  async restoreVersion(userId: string, cvId: string, versionId: string) {
    const current = await this.getAccessible(userId, cvId, 'edit');
    const version = await this.getVersion(userId, cvId, versionId);

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

    return this.getAccessible(userId, cvId);
  }

  private async assertTemplateAccess(userId: string, templateId?: string) {
    if (!templateId) return;
    const template = await this.prisma.template.findFirst({
      where: { id: templateId },
      select: { isPremium: true },
    });
    if (!template?.isPremium) return;
    await this.entitlements.assertCan(userId, 'templates:pro', PREMIUM_TEMPLATE_MESSAGE);
  }

  private async assertTemplateKeyAccess(userId: string, templateKey?: string) {
    if (!templateKey || !PREMIUM_TEMPLATE_KEYS.has(templateKey)) return;
    await this.entitlements.assertCan(userId, 'templates:pro', PREMIUM_TEMPLATE_MESSAGE);
  }
}

import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, TemplateCategory } from '@prisma/client';
import { resolveTemplateAccessTier, type TemplateAccessType } from '@cvstudio/shared-utils';
import { PrismaService } from '../../database/prisma.module';
import { TEMPLATE_SEEDS } from './template-seeds';

/** Official catalog only — seller-owned marketplace templates never appear here. */
const CATALOG_WHERE = { isPublished: true, createdBy: null } as const;

@Injectable()
export class TemplatesService {
  constructor(private readonly prisma: PrismaService) {}

  private mapSeed(seed: (typeof TEMPLATE_SEEDS)[number]) {
    const mapped = {
      id: seed.id,
      name: seed.name,
      description: seed.description,
      category: seed.category,
      previewImageUrl: seed.previewImageUrl,
      isPremium: seed.isPremium,
      price: seed.price,
      rating: seed.rating,
      downloadCount: seed.downloadCount,
      isPublished: seed.isPublished,
      designData: seed.designData,
    };
    return {
      ...mapped,
      accessTier: resolveTemplateAccessTier(mapped),
    };
  }

  private annotate<T extends { isPremium?: boolean; designData?: unknown }>(item: T) {
    const designData = item.designData as { tier?: string } | null | undefined;
    return {
      ...item,
      accessTier: resolveTemplateAccessTier({
        isPremium: item.isPremium,
        designData: designData ?? null,
      }),
    };
  }

  async list(query: { limit?: number; premium?: boolean; cursor?: string }) {
    const limit = query.limit ?? 20;
    try {
      const items = await this.prisma.template.findMany({
        where: {
          ...CATALOG_WHERE,
          ...(query.premium !== undefined ? { isPremium: query.premium } : {}),
        },
        orderBy: { rating: 'desc' },
        take: limit,
        select: {
          id: true,
          name: true,
          description: true,
          category: true,
          previewImageUrl: true,
          isPremium: true,
          price: true,
          rating: true,
          downloadCount: true,
          designData: true,
        },
      });
      if (items.length > 0) return { items: items.map((item) => this.annotate(item)) };
    } catch {
      // DB unavailable — fall through to seeds
    }

    let items = TEMPLATE_SEEDS.map((s) => this.mapSeed(s));
    if (query.premium !== undefined) {
      items = items.filter((t) => t.isPremium === query.premium);
    }
    return { items: items.slice(0, limit) };
  }

  async get(id: string) {
    try {
      const template = await this.prisma.template.findFirst({
        where: { id, ...CATALOG_WHERE },
      });
      if (template) return this.annotate(template);
    } catch {
      /* fallthrough */
    }

    const seed = TEMPLATE_SEEDS.find((t) => t.id === id);
    if (!seed) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Template not found' });
    return this.mapSeed(seed);
  }

  async byCategory(category: string) {
    try {
      const items = await this.prisma.template.findMany({
        where: {
          ...CATALOG_WHERE,
          category: category as TemplateCategory,
        },
        orderBy: { rating: 'desc' },
      });
      if (items.length > 0) return items.map((item) => this.annotate(item));
    } catch {
      /* fallthrough */
    }
    return TEMPLATE_SEEDS.filter((t) => t.category === category).map((s) => this.mapSeed(s));
  }

  async findByTypes(types: TemplateAccessType[]) {
    const allowed = new Set(types);
    const { items } = await this.list({ limit: 100 });
    return { items: items.filter((t) => allowed.has(t.accessTier)) };
  }

  /** Idempotent upsert of official templates (call from bootstrap / migration job). */
  async ensureSeeded() {
    for (const seed of TEMPLATE_SEEDS) {
      await this.prisma.template.upsert({
        where: { id: seed.id },
        create: {
          id: seed.id,
          name: seed.name,
          description: seed.description,
          category: seed.category,
          previewImageUrl: seed.previewImageUrl,
          isPremium: seed.isPremium,
          price: seed.price ?? undefined,
          designData: seed.designData as Prisma.InputJsonValue,
          isPublished: true,
          downloadCount: seed.downloadCount,
          rating: seed.rating,
        },
        update: {
          name: seed.name,
          description: seed.description,
          designData: seed.designData as Prisma.InputJsonValue,
          isPublished: true,
          previewImageUrl: seed.previewImageUrl,
        },
      });
    }
    return { seeded: TEMPLATE_SEEDS.length };
  }
}

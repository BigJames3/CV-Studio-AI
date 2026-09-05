import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, TemplateCategory } from '@prisma/client';
import { templateAccessType, type TemplateAccessType } from '@cvstudio/shared-utils';
import { PrismaService } from '../../database/prisma.module';
import { TEMPLATE_SEEDS } from './template-seeds';

/** Official catalog only — seller-owned marketplace templates never appear here. */
const CATALOG_WHERE = { isPublished: true, createdBy: null } as const;

type ListQuery = {
  limit?: number;
  premium?: boolean;
  cursor?: string;
  allowedTypes?: TemplateAccessType[];
};

@Injectable()
export class TemplatesService {
  constructor(private readonly prisma: PrismaService) {}

  private mapSeed(seed: (typeof TEMPLATE_SEEDS)[number]) {
    return {
      id: seed.id,
      name: seed.name,
      description: seed.description,
      category: seed.category,
      previewImageUrl: seed.previewImageUrl,
      isPremium: seed.isPremium,
      accessTier: templateAccessType(seed.isPremium),
      price: seed.price,
      rating: seed.rating,
      downloadCount: seed.downloadCount,
      isPublished: seed.isPublished,
      designData: seed.designData,
    };
  }

  private prismaTierWhere(allowedTypes?: TemplateAccessType[]) {
    if (!allowedTypes) return {};
    const allowPremium = allowedTypes.includes('pro') || allowedTypes.includes('business');
    const allowFree = allowedTypes.includes('free');
    if (allowPremium && allowFree) return {};
    if (allowPremium) return { isPremium: true };
    return { isPremium: false };
  }

  private filterByTypes<T extends { isPremium: boolean }>(
    items: T[],
    allowedTypes?: TemplateAccessType[]
  ) {
    if (!allowedTypes) return items;
    return items.filter((t) => allowedTypes.includes(templateAccessType(t.isPremium)));
  }

  private withAccess<T extends { isPremium: boolean }>(item: T) {
    return { ...item, accessTier: templateAccessType(item.isPremium) };
  }

  async list(query: ListQuery) {
    const limit = query.limit ?? 20;
    const tierWhere = this.prismaTierWhere(query.allowedTypes);
    try {
      const items = await this.prisma.template.findMany({
        where: {
          ...CATALOG_WHERE,
          ...tierWhere,
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
      if (items.length > 0) return { items: items.map((t) => this.withAccess(t)) };
    } catch {
      // DB unavailable — fall through to seeds
    }

    let items = TEMPLATE_SEEDS.map((s) => this.mapSeed(s));
    if (query.premium !== undefined) {
      items = items.filter((t) => t.isPremium === query.premium);
    }
    items = this.filterByTypes(items, query.allowedTypes);
    return { items: items.slice(0, limit) };
  }

  findByTypes(allowedTypes: TemplateAccessType[]) {
    return this.list({ allowedTypes });
  }

  async get(id: string) {
    try {
      const template = await this.prisma.template.findFirst({
        where: { id, ...CATALOG_WHERE },
      });
      if (template) return template;
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
      if (items.length > 0) return items.map((t) => this.withAccess(t));
    } catch {
      /* fallthrough */
    }
    return TEMPLATE_SEEDS.filter((t) => t.category === category).map((s) => this.mapSeed(s));
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

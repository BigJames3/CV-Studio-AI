import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, TemplateCategory } from '@prisma/client';
import { PrismaService } from '../../database/prisma.module';
import { TEMPLATE_SEEDS } from './template-seeds';

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
      price: seed.price,
      rating: seed.rating,
      downloadCount: seed.downloadCount,
      isPublished: seed.isPublished,
      designData: seed.designData,
    };
  }

  async list(query: { limit?: number; premium?: boolean; cursor?: string }) {
    const limit = query.limit ?? 20;
    try {
      const items = await this.prisma.template.findMany({
        where: {
          isPublished: true,
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
      if (items.length > 0) return { items };
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
        where: { id, isPublished: true },
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
          isPublished: true,
          category: category as TemplateCategory,
        },
        orderBy: { rating: 'desc' },
      });
      if (items.length > 0) return items;
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

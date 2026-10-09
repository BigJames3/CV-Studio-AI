import { Injectable, Logger } from '@nestjs/common';
import { Prisma, TemplateCategory } from '@prisma/client';
import { templateAccessType } from '@cvstudio/shared-utils';
import { PrismaService } from '../../database/prisma.module';
import { TEMPLATE_SEEDS } from '../templates/template-seeds';
import type { CatalogQueryDto, CatalogSort } from './dto/catalog-query.dto';

/** One card of the unified shop. Never carries designData. */
export type CatalogItem =
  | {
      kind: 'official';
      id: string;
      title: string;
      description: string | null;
      category: string;
      /** Editor layout, already public in the web bundle: lets the page draw a thumbnail. */
      layoutKey: string | null;
      /** Plan needed to use it; official templates are never sold one by one. */
      access: 'free' | 'pro';
      rating: number | null;
      href: string;
    }
  | {
      kind: 'seller';
      id: string;
      title: string;
      description: string | null;
      category: string;
      previewImageUrl: string | null;
      priceCents: number;
      currency: string;
      rating: number | null;
      reviewCount: number;
      seller: { displayName: string; slug: string } | null;
      href: string;
    };

/** Official templates: shipped by CV Studio AI (no creator), published. */
const OFFICIAL_WHERE = { createdBy: null, isPublished: true } satisfies Prisma.TemplateWhereInput;

/**
 * Seller listings a moderator approved, still published, from a seller in good standing.
 * Submitted, in review, rejected, withdrawn and suspended listings never show.
 */
const SELLER_WHERE = {
  status: 'published',
  isPublished: true,
  sellerProfile: { is: { status: 'active' } },
} satisfies Prisma.MarketplaceTemplateWhereInput;

function officialOrder(sort: CatalogSort): Prisma.TemplateOrderByWithRelationInput[] {
  switch (sort) {
    case 'newest':
      return [{ createdAt: 'desc' }, { name: 'asc' }];
    case 'rating':
      return [{ rating: 'desc' }, { name: 'asc' }];
    // Official templates come with the plan, not for a price: keep a stable order.
    case 'price_low':
    case 'price_high':
      return [{ name: 'asc' }];
    default:
      return [{ downloadCount: 'desc' }, { rating: 'desc' }, { name: 'asc' }];
  }
}

function sellerOrder(sort: CatalogSort): Prisma.MarketplaceTemplateOrderByWithRelationInput[] {
  switch (sort) {
    case 'newest':
      return [{ publishedAt: 'desc' }, { id: 'asc' }];
    case 'price_low':
      return [{ priceCents: 'asc' }, { id: 'asc' }];
    case 'price_high':
      return [{ priceCents: 'desc' }, { id: 'asc' }];
    case 'rating':
      return [{ rating: 'desc' }, { reviewCount: 'desc' }, { id: 'asc' }];
    default:
      return [{ rating: 'desc' }, { downloadCount: 'desc' }, { id: 'asc' }];
  }
}

function toNumber(value: unknown): number | null {
  if (value == null) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function layoutKey(designData: unknown): string | null {
  const key = (designData as { key?: unknown } | null)?.key;
  return typeof key === 'string' ? key : null;
}

/**
 * The /marketplace shop: official templates first, then approved seller listings, one page
 * at a time across both. Showing a template is not a right to use it: the plan (official)
 * and the licence (seller) are still checked when a CV uses it.
 */
@Injectable()
export class MarketplaceCatalogService {
  private readonly logger = new Logger(MarketplaceCatalogService.name);

  constructor(private readonly prisma: PrismaService) {}

  async catalog(query: CatalogQueryDto) {
    const source = query.source ?? 'all';
    const sort = query.sort ?? 'popular';
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 24;
    const q = query.q?.trim() || undefined;
    const start = (page - 1) * pageSize;

    const officialWhere: Prisma.TemplateWhereInput = {
      ...OFFICIAL_WHERE,
      ...(query.category ? { category: query.category } : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: 'insensitive' } },
              { description: { contains: q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const sellerWhere: Prisma.MarketplaceTemplateWhereInput = {
      ...SELLER_WHERE,
      ...(query.category ? { template: { category: query.category } } : {}),
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: 'insensitive' } },
              { description: { contains: q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const official =
      source === 'seller'
        ? { total: 0, items: [] as CatalogItem[] }
        : await this.officialSlice(officialWhere, sort, start, pageSize, query, q);
    const sellerStart = Math.max(0, start - official.total);
    const sellerTake = pageSize - official.items.length;
    const seller =
      source === 'official'
        ? { total: 0, items: [] as CatalogItem[] }
        : await this.sellerSlice(sellerWhere, sort, sellerStart, sellerTake);

    return {
      items: [...official.items, ...seller.items],
      page,
      pageSize,
      total: official.total + seller.total,
      totals: { official: official.total, seller: seller.total },
    };
  }

  private async officialSlice(
    where: Prisma.TemplateWhereInput,
    sort: CatalogSort,
    skip: number,
    take: number,
    query: CatalogQueryDto,
    q?: string
  ): Promise<{ total: number; items: CatalogItem[] }> {
    try {
      const [total, rows] = await Promise.all([
        this.prisma.template.count({ where }),
        this.prisma.template.findMany({
          where,
          orderBy: officialOrder(sort),
          skip,
          take,
          select: {
            id: true,
            name: true,
            description: true,
            category: true,
            isPremium: true,
            rating: true,
            designData: true,
          },
        }),
      ]);
      // An empty catalogue table (not seeded yet) falls back to the shipped seeds, like
      // GET /templates; a filtered search with no match is a real empty result.
      const anyOfficial =
        total > 0 || (await this.prisma.template.count({ where: OFFICIAL_WHERE })) > 0;
      if (anyOfficial) {
        return { total, items: rows.map((t) => this.officialItem(t)) };
      }
    } catch (err) {
      this.logger.warn(`Official catalogue unavailable, using seeds: ${String(err)}`);
    }
    return this.seedSlice(sort, skip, take, query.category, q);
  }

  private seedSlice(
    sort: CatalogSort,
    skip: number,
    take: number,
    category?: TemplateCategory,
    q?: string
  ) {
    const needle = q?.toLowerCase();
    const matches = TEMPLATE_SEEDS.filter(
      (s) =>
        s.isPublished &&
        (!category || s.category === category) &&
        (!needle ||
          s.name.toLowerCase().includes(needle) ||
          s.description.toLowerCase().includes(needle))
    ).sort((a, b) => {
      if (sort === 'rating') return b.rating - a.rating || a.name.localeCompare(b.name);
      if (sort === 'popular')
        return b.downloadCount - a.downloadCount || a.name.localeCompare(b.name);
      return a.name.localeCompare(b.name);
    });
    return {
      total: matches.length,
      items: matches.slice(skip, skip + take).map((s) =>
        this.officialItem({
          id: s.id,
          name: s.name,
          description: s.description,
          category: s.category,
          isPremium: s.isPremium,
          rating: s.rating,
          designData: s.designData,
        })
      ),
    };
  }

  private officialItem(t: {
    id: string;
    name: string;
    description: string | null;
    category: string;
    isPremium: boolean;
    rating: unknown;
    designData: unknown;
  }): CatalogItem {
    return {
      kind: 'official',
      id: t.id,
      title: t.name,
      description: t.description,
      category: t.category,
      layoutKey: layoutKey(t.designData),
      access: templateAccessType(t.isPremium) === 'pro' ? 'pro' : 'free',
      rating: toNumber(t.rating),
      href: `/dashboard/templates?template=${t.id}`,
    };
  }

  private async sellerSlice(
    where: Prisma.MarketplaceTemplateWhereInput,
    sort: CatalogSort,
    skip: number,
    take: number
  ): Promise<{ total: number; items: CatalogItem[] }> {
    const [total, rows] = await Promise.all([
      this.prisma.marketplaceTemplate.count({ where }),
      take > 0
        ? this.prisma.marketplaceTemplate.findMany({
            where,
            orderBy: sellerOrder(sort),
            skip,
            take,
            select: {
              id: true,
              title: true,
              description: true,
              priceCents: true,
              currency: true,
              rating: true,
              reviewCount: true,
              template: { select: { category: true, previewImageUrl: true } },
              sellerProfile: { select: { displayName: true, slug: true } },
            },
          })
        : Promise.resolve([]),
    ]);
    return {
      total,
      items: rows.map((l) => ({
        kind: 'seller' as const,
        id: l.id,
        title: l.title,
        description: l.description,
        category: l.template.category,
        previewImageUrl: l.template.previewImageUrl,
        priceCents: l.priceCents,
        currency: l.currency,
        rating: toNumber(l.rating),
        reviewCount: l.reviewCount,
        seller: l.sellerProfile,
        href: `/marketplace/${l.id}`,
      })),
    };
  }
}

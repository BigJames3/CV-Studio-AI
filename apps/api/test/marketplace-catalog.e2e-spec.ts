import { INestApplication } from '@nestjs/common';
import { ListingStatus } from '@prisma/client';
import request from 'supertest';
import { createTestApp } from './create-test-app';
import { PrismaService } from '../src/database/prisma.module';
import { TEMPLATE_SEEDS } from '../src/modules/templates/template-seeds';

/**
 * Unified /marketplace/catalog against the real Postgres: official templates (seeded, or the
 * shipped seeds when the table is empty) then seller listings, by visibility rules.
 */
describe('Marketplace catalogue (e2e, real database)', () => {
  jest.setTimeout(60_000);
  let app: INestApplication;
  let prisma: PrismaService;
  const stamp = `${Date.now()}`;
  const userIds: string[] = [];
  let officialTotal = 0;
  const listingIds: Record<string, string> = {};

  type Item = { kind: 'official' | 'seller'; id: string; title: string; access?: string };
  type Page = {
    items: Item[];
    page: number;
    pageSize: number;
    total: number;
    totals: { official: number; seller: number };
  };
  const catalog = async (query: Record<string, string | number> = {}): Promise<Page> => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/marketplace/catalog')
      .query({ q: `cat-${stamp}`, ...query })
      .expect(200);
    return res.body.data as Page;
  };
  const allOfficial = async (query: Record<string, string | number> = {}): Promise<Page> => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/marketplace/catalog')
      .query({ source: 'official', pageSize: 48, ...query })
      .expect(200);
    return res.body.data as Page;
  };

  async function sellerWithListings(
    sellerStatus: 'active' | 'suspended',
    listings: Array<{ status: ListingStatus; isPublished: boolean; tag: string; price?: number }>
  ) {
    const user = await prisma.user.create({
      data: {
        email: `e2e+cat-${stamp}-${Math.random().toString(36).slice(2)}@example.com`,
        firstName: 'Cat',
        lastName: 'Seller',
      },
    });
    userIds.push(user.id);
    const profile = await prisma.sellerProfile.create({
      data: {
        userId: user.id,
        displayName: `Seller ${sellerStatus}`,
        slug: `cat-${stamp}-${sellerStatus}-${Math.random().toString(36).slice(2, 6)}`,
        country: 'FR',
        status: sellerStatus,
      },
    });
    for (const l of listings) {
      const template = await prisma.template.create({
        data: {
          name: `Design ${l.tag}`,
          description: 'E2E design',
          category: 'modern',
          previewImageUrl: '/p.png',
          designData: { key: 'modern', secretMarker: `design-${stamp}` },
          createdBy: user.id,
          isPublished: false,
          isPremium: true,
        },
      });
      const listing = await prisma.marketplaceTemplate.create({
        data: {
          templateId: template.id,
          sellerId: user.id,
          sellerProfileId: profile.id,
          title: `cat-${stamp} ${l.tag}`,
          slug: `cat-${stamp}-${l.tag}`,
          priceCents: l.price ?? 999,
          status: l.status,
          isPublished: l.isPublished,
          publishedAt: l.isPublished ? new Date() : null,
        },
      });
      listingIds[l.tag] = listing.id;
    }
  }

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);

    const dbOfficial = await prisma.template.count({
      where: { createdBy: null, isPublished: true },
    });
    officialTotal =
      dbOfficial > 0 ? dbOfficial : TEMPLATE_SEEDS.filter((s) => s.isPublished).length;

    await sellerWithListings('active', [
      { status: 'published', isPublished: true, tag: 'pub-a', price: 1500 },
      { status: 'published', isPublished: true, tag: 'pub-b', price: 500 },
      { status: 'submitted', isPublished: false, tag: 'submitted' },
      { status: 'in_review', isPublished: false, tag: 'in-review' },
      { status: 'suspended', isPublished: false, tag: 'suspended' },
      { status: 'unpublished', isPublished: false, tag: 'withdrawn' },
      { status: 'rejected', isPublished: false, tag: 'rejected' },
    ]);
    // A published listing whose seller was suspended does not show either.
    await sellerWithListings('suspended', [
      { status: 'published', isPublished: true, tag: 'bad-seller' },
    ]);
  });

  afterAll(async () => {
    if (prisma && userIds.length) {
      await prisma.marketplaceTemplate.deleteMany({ where: { sellerId: { in: userIds } } });
      await prisma.template.deleteMany({ where: { createdBy: { in: userIds } } });
      await prisma.sellerProfile.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    }
    if (app) await app.close();
  });

  it('lists every eligible official template, free and Pro, without login', async () => {
    const page = await allOfficial();
    expect(page.totals.official).toBe(officialTotal);
    expect(page.items).toHaveLength(Math.min(officialTotal, 48));
    expect(page.items.every((i) => i.kind === 'official')).toBe(true);
    expect(new Set(page.items.map((i) => i.access))).toEqual(new Set(['free', 'pro']));
  });

  it('shows only approved, published listings of sellers in good standing', async () => {
    const page = await catalog({ source: 'seller' });
    expect(page.items.map((i) => i.id).sort()).toEqual(
      [listingIds['pub-a'], listingIds['pub-b']].sort()
    );
    for (const hidden of [
      'submitted',
      'in-review',
      'suspended',
      'withdrawn',
      'rejected',
      'bad-seller',
    ]) {
      expect(page.items.some((i) => i.id === listingIds[hidden])).toBe(false);
    }
  });

  it('puts both sources in one shop with no duplicate and no designData', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/marketplace/catalog')
      .query({ pageSize: 48 })
      .expect(200);
    const body = JSON.stringify(res.body);
    expect(body).not.toContain('designData');
    expect(body).not.toContain(`design-${stamp}`);

    const items = res.body.data.items as Item[];
    const keys = items.map((i) => `${i.kind}:${i.id}`);
    expect(new Set(keys).size).toBe(keys.length);
    // Official first, then sellers.
    const firstSeller = items.findIndex((i) => i.kind === 'seller');
    if (firstSeller >= 0) {
      expect(items.slice(firstSeller).every((i) => i.kind === 'seller')).toBe(true);
    }
  });

  it('pages across both sources without losing or repeating a card', async () => {
    const all = await request(app.getHttpServer())
      .get('/api/v1/marketplace/catalog')
      .query({ pageSize: 48 })
      .expect(200);
    const total = all.body.data.total as number;
    const seen: string[] = [];
    for (let page = 1; page <= Math.ceil(total / 5); page++) {
      const res = await request(app.getHttpServer())
        .get('/api/v1/marketplace/catalog')
        .query({ pageSize: 5, page })
        .expect(200);
      seen.push(...(res.body.data.items as Item[]).map((i) => `${i.kind}:${i.id}`));
    }
    expect(seen).toHaveLength(total);
    expect(new Set(seen).size).toBe(total);
  });

  it('filters by source, search, category and sorts sellers by price', async () => {
    const official = await catalog({ source: 'official' });
    expect(official.items).toHaveLength(0); // no official template matches the test stamp

    const byPrice = await catalog({ source: 'seller', sort: 'price_low' });
    expect(byPrice.items.map((i) => i.id)).toEqual([listingIds['pub-b'], listingIds['pub-a']]);

    const executive = await catalog({ source: 'seller', category: 'executive' });
    expect(executive.total).toBe(0);

    const firstOfficial = (await allOfficial()).items[0];
    const searched = await allOfficial({ q: firstOfficial.title });
    expect(searched.items.some((i) => i.id === firstOfficial.id)).toBe(true);
  });

  it('rejects invalid filters', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/marketplace/catalog')
      .query({ source: 'drafts' })
      .expect(400);
    await request(app.getHttpServer())
      .get('/api/v1/marketplace/catalog')
      .query({ pageSize: 500 })
      .expect(400);
  });

  it('hidden listings are gone from the public detail page too', async () => {
    for (const hidden of ['submitted', 'suspended', 'withdrawn', 'bad-seller']) {
      await request(app.getHttpServer())
        .get(`/api/v1/marketplace/templates/${listingIds[hidden]}`)
        .expect(404);
    }
    const shown = await request(app.getHttpServer())
      .get(`/api/v1/marketplace/templates/${listingIds['pub-a']}`)
      .expect(200);
    expect(JSON.stringify(shown.body)).not.toContain('designData');
    expect(shown.body.data.sellerProfile).not.toHaveProperty('status');
  });
});

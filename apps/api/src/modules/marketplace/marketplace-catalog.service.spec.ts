import { MarketplaceCatalogService } from './marketplace-catalog.service';
import { TEMPLATE_SEEDS } from '../templates/template-seeds';

function setup(officialCount: number, sellerCount: number) {
  const official = Array.from({ length: officialCount }, (_, i) => ({
    id: `t${i}`,
    name: `Official ${i}`,
    description: null,
    category: 'modern',
    isPremium: i % 2 === 1,
    rating: 4,
    designData: { key: 'modern', defaults: { secret: true } },
  }));
  const sellers = Array.from({ length: sellerCount }, (_, i) => ({
    id: `l${i}`,
    title: `Listing ${i}`,
    description: null,
    priceCents: 999,
    currency: 'USD',
    rating: 0,
    reviewCount: 0,
    template: { category: 'modern', previewImageUrl: '/p.png' },
    sellerProfile: { displayName: 'Ada', slug: 'ada' },
  }));
  const prisma = {
    template: {
      count: jest.fn().mockResolvedValue(officialCount),
      findMany: jest.fn(async ({ skip, take }) => official.slice(skip, skip + take)),
    },
    marketplaceTemplate: {
      count: jest.fn().mockResolvedValue(sellerCount),
      findMany: jest.fn(async ({ skip, take }) => sellers.slice(skip, skip + take)),
    },
  };
  return { service: new MarketplaceCatalogService(prisma as never), prisma };
}

describe('MarketplaceCatalogService', () => {
  it('fills a page with the last official templates then the first listings', async () => {
    const { service, prisma } = setup(5, 4);

    const page = await service.catalog({ page: 2, pageSize: 3 });

    expect(page.items.map((i) => `${i.kind}:${i.id}`)).toEqual([
      'official:t3',
      'official:t4',
      'seller:l0',
    ]);
    expect(page).toMatchObject({ total: 9, totals: { official: 5, seller: 4 } });
    expect(prisma.marketplaceTemplate.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 0, take: 1 })
    );
  });

  it('skips the official templates once past them', async () => {
    const { service, prisma } = setup(5, 4);
    const page = await service.catalog({ page: 3, pageSize: 3 });
    expect(page.items.map((i) => i.id)).toEqual(['l1', 'l2', 'l3']);
    expect(prisma.marketplaceTemplate.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 1, take: 3 })
    );
  });

  it('only asks the source that was chosen', async () => {
    const { service, prisma } = setup(5, 4);
    await service.catalog({ source: 'seller' });
    expect(prisma.template.findMany).not.toHaveBeenCalled();

    const other = setup(5, 4);
    const official = await other.service.catalog({ source: 'official' });
    expect(other.prisma.marketplaceTemplate.findMany).not.toHaveBeenCalled();
    expect(official.totals.seller).toBe(0);
  });

  it('never returns designData, only the layout key and the plan needed', async () => {
    const { service } = setup(2, 1);
    const page = await service.catalog({});
    expect(JSON.stringify(page)).not.toContain('designData');
    expect(JSON.stringify(page)).not.toContain('secret');
    expect(page.items[0]).toMatchObject({ kind: 'official', layoutKey: 'modern', access: 'free' });
    expect(page.items[1]).toMatchObject({ access: 'pro' });
  });

  it('shows the shipped templates when the catalogue table was not seeded', async () => {
    const { service } = setup(0, 0);
    const page = await service.catalog({ source: 'official', pageSize: 48 });
    expect(page.totals.official).toBe(TEMPLATE_SEEDS.filter((s) => s.isPublished).length);
  });
});

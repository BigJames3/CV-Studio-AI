import { NotFoundException } from '@nestjs/common';
import { TemplatesService } from './templates.service';

describe('TemplatesService catalog isolation (issue 4)', () => {
  const prisma = {
    template: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      upsert: jest.fn(),
    },
  };

  let service: TemplatesService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new TemplatesService(prisma as never);
  });

  it('list only queries official catalog templates (createdBy null)', async () => {
    prisma.template.findMany.mockResolvedValue([
      { id: 'official', isPremium: false, designData: { ok: true } },
    ]);

    await service.list({});

    expect(prisma.template.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ isPublished: true, createdBy: null }),
      })
    );
  });

  it('get does not return a seller-owned template even if published', async () => {
    prisma.template.findFirst.mockResolvedValue(null);

    await expect(service.get('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')).rejects.toBeInstanceOf(
      NotFoundException
    );
    expect(prisma.template.findFirst).toHaveBeenCalledWith({
      where: { id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', isPublished: true, createdBy: null },
      select: expect.any(Object),
    });
  });

  it('filters seeds to free templates when allowedTypes is free-only', async () => {
    prisma.template.findMany.mockRejectedValue(new Error('db down'));
    const result = await service.list({ allowedTypes: ['free'] });
    expect(result.items.every((t) => t.isPremium === false)).toBe(true);
    expect(result.items.some((t) => t.accessTier === 'free')).toBe(true);
  });

  it('includes premium templates for business allowedTypes', async () => {
    prisma.template.findMany.mockRejectedValue(new Error('db down'));
    const result = await service.findByTypes(['free', 'pro', 'business']);
    expect(result.items.some((t) => t.isPremium)).toBe(true);
  });

  it('byCategory excludes seller-owned templates', async () => {
    prisma.template.findMany.mockResolvedValue([{ id: 'official', isPremium: false }]);

    await service.byCategory('modern');

    expect(prisma.template.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          isPublished: true,
          createdBy: null,
          category: 'modern',
        }),
      })
    );
  });

  describe('public routes never expose designData (SEC-006)', () => {
    const PREMIUM_ID = '11111111-1111-4111-8111-111111111103';

    it('get selects only public fields from the database', async () => {
      prisma.template.findFirst.mockResolvedValue({ id: PREMIUM_ID, isPremium: true });

      const result = await service.get(PREMIUM_ID);

      const { select } = prisma.template.findFirst.mock.calls[0][0];
      expect(select).toBeDefined();
      expect(select.designData).toBeUndefined();
      expect(result).toMatchObject({ accessTier: 'pro' });
    });

    it('get omits designData when falling back to seeds', async () => {
      prisma.template.findFirst.mockRejectedValue(new Error('db down'));

      const result = await service.get(PREMIUM_ID);

      expect(result.isPremium).toBe(true);
      expect(result).not.toHaveProperty('designData');
    });

    it('byCategory selects only public fields from the database', async () => {
      prisma.template.findMany.mockResolvedValue([{ id: 'official', isPremium: true }]);

      await service.byCategory('executive');

      const { select } = prisma.template.findMany.mock.calls[0][0];
      expect(select).toBeDefined();
      expect(select.designData).toBeUndefined();
    });

    it('byCategory omits designData when falling back to seeds', async () => {
      prisma.template.findMany.mockRejectedValue(new Error('db down'));

      const items = await service.byCategory('executive');

      expect(items.length).toBeGreaterThan(0);
      items.forEach((t) => expect(t).not.toHaveProperty('designData'));
    });

    it('list still returns designData to signed-in users', async () => {
      prisma.template.findMany.mockRejectedValue(new Error('db down'));

      const result = await service.list({ allowedTypes: ['free'] });

      expect(result.items[0]).toHaveProperty('designData');
    });
  });
});

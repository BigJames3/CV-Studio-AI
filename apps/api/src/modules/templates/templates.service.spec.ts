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
});

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
    prisma.template.findMany.mockResolvedValue([{ id: 'official', designData: { ok: true } }]);

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

  it('byCategory excludes seller-owned templates', async () => {
    prisma.template.findMany.mockResolvedValue([{ id: 'official' }]);

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

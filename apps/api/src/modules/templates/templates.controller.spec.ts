import { TemplatesService } from './templates.service';
import { TemplatesController } from './templates.controller';
import { FeatureGateService } from '../../common/services/feature-gate.service';

describe('TemplatesService.findByTypes', () => {
  const prisma = {
    template: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      upsert: jest.fn(),
    },
  };

  it('filters catalog to free templates for free/pro types', async () => {
    prisma.template.findMany.mockResolvedValue([
      { id: 'free-1', isPremium: false, designData: {} },
      { id: 'pro-1', isPremium: true, designData: { tier: 'pro' } },
    ]);
    const service = new TemplatesService(prisma as never);
    const result = await service.findByTypes(['free']);
    expect(result.items.map((t) => t.id)).toEqual(['free-1']);
  });

  it('includes pro and business templates for business types', async () => {
    prisma.template.findMany.mockResolvedValue([
      { id: 'free-1', isPremium: false, designData: {} },
      { id: 'pro-1', isPremium: true, designData: { tier: 'pro' } },
      { id: 'biz-1', isPremium: true, designData: { tier: 'business' } },
    ]);
    const service = new TemplatesService(prisma as never);
    const result = await service.findByTypes(['free', 'pro', 'business']);
    expect(result.items.map((t) => t.id)).toEqual(['free-1', 'pro-1', 'biz-1']);
  });
});

describe('TemplatesController.listAvailable', () => {
  it('asks FeatureGate for allowed types then filters', async () => {
    const templates = {
      findByTypes: jest.fn().mockResolvedValue({ items: [{ id: 'free-1' }] }),
    };
    const controller = new TemplatesController(templates as never, new FeatureGateService());
    const result = await controller.listAvailable({
      id: 'u1',
      email: 'a@b.c',
      subscriptionTier: 'pro',
      roles: [],
    });
    expect(templates.findByTypes).toHaveBeenCalledWith(['free']);
    expect(result.items).toHaveLength(1);
  });

  it('returns all types for business', async () => {
    const templates = {
      findByTypes: jest.fn().mockResolvedValue({ items: [{ id: 'a' }, { id: 'b' }] }),
    };
    const controller = new TemplatesController(templates as never, new FeatureGateService());
    await controller.listAvailable({
      id: 'u1',
      email: 'a@b.c',
      subscriptionTier: 'business',
      roles: [],
    });
    expect(templates.findByTypes).toHaveBeenCalledWith(['free', 'pro', 'business']);
  });
});

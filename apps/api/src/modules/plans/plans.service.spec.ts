import {
  mapPlanToPublicDto,
  PLAN_CACHE_KEY,
  PlansService,
  TRIAL_PERIOD_DAYS,
} from './plans.service';

const FREE = {
  name: 'Free',
  description: '1 CV',
  priceMonthly: 0,
  priceYearly: 0,
  cvLimit: 1,
  aiFeatures: false,
  prioritySupport: false,
  customDomain: false,
  marketplaceAccess: false,
  apiAccess: false,
};

const PRO = {
  name: 'Pro',
  description: '5 CVs',
  priceMonthly: 9.99,
  priceYearly: 99,
  cvLimit: 5,
  aiFeatures: true,
  prioritySupport: true,
  customDomain: false,
  marketplaceAccess: true,
  apiAccess: false,
};

const BUSINESS = {
  name: 'Business',
  description: 'Teams',
  priceMonthly: 29.99,
  priceYearly: 299,
  cvLimit: 20,
  aiFeatures: true,
  prioritySupport: true,
  customDomain: true,
  marketplaceAccess: true,
  apiAccess: true,
};

describe('mapPlanToPublicDto', () => {
  it('maps Free with display name Gratuit and no annual price or trial', () => {
    const dto = mapPlanToPublicDto(FREE);
    expect(dto).toMatchObject({
      id: 'free',
      name: 'Gratuit',
      position: 0,
      priceMonthly: 0,
      priceAnnual: null,
      trialDays: null,
      recommended: false,
      currency: 'EUR',
    });
    expect(dto.entitlements.find((e) => e.feature === 'cvLimit')).toEqual({
      feature: 'cvLimit',
      value: '1',
      included: true,
    });
    expect(dto.currency).toBe('EUR');
    expect(dto.entitlements.find((e) => e.feature === 'downloadPdf')?.included).toBe(true);
    expect(dto.entitlements.find((e) => e.feature === 'aiFeatures')?.included).toBe(false);
    expect(dto.entitlements.find((e) => e.feature === 'templates')).toEqual({
      feature: 'templates',
      value: '5',
      included: true,
    });
    expect(dto.entitlements.find((e) => e.feature === 'collaborate')?.included).toBe(false);
    expect(dto.entitlements.some((e) => /docx/i.test(e.feature))).toBe(false);
  });

  it('maps Pro with annual savings inputs and 14-day trial', () => {
    const dto = mapPlanToPublicDto(PRO);
    expect(dto).toMatchObject({
      id: 'pro',
      name: 'Pro',
      position: 1,
      priceMonthly: 9.99,
      priceAnnual: 99,
      trialDays: TRIAL_PERIOD_DAYS,
      recommended: true,
      currency: 'EUR',
    });
    expect(dto.currency).toBe('EUR');
    expect(dto.currency).toBe('EUR');
    expect(dto.entitlements.find((e) => e.feature === 'cvLimit')?.value).toBe('5');
    expect(dto.entitlements.find((e) => e.feature === 'aiFeatures')?.included).toBe(true);
    expect(dto.entitlements.find((e) => e.feature === 'templates')?.value).toBe('unlimited');
    expect(dto.entitlements.find((e) => e.feature === 'collaborate')?.included).toBe(false);
  });

  it('maps Business entitlements including API', () => {
    const dto = mapPlanToPublicDto(BUSINESS);
    expect(dto.id).toBe('business');
    expect(dto.priceMonthly).toBe(29.99);
    expect(dto.priceAnnual).toBe(299);
    expect(dto.entitlements.find((e) => e.feature === 'apiAccess')?.included).toBe(true);
    expect(dto.entitlements.find((e) => e.feature === 'customDomain')?.included).toBe(true);
    expect(dto.entitlements.find((e) => e.feature === 'collaborate')?.included).toBe(true);
    expect(dto.entitlements.find((e) => e.feature === 'cvLimit')?.value).toBe('20');
  });
});

describe('PlansService.findAll', () => {
  const prisma = {
    plan: { findMany: jest.fn() },
  };
  const redis = {
    get: jest.fn(),
    set: jest.fn(),
  };

  let service: PlansService;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.plan.findMany.mockResolvedValue([FREE, PRO, BUSINESS]);
    redis.get.mockResolvedValue(null);
    redis.set.mockResolvedValue(undefined);
    service = new PlansService(prisma as never, redis as never);
  });

  it('returns mapped plans ordered from Prisma and caches them', async () => {
    const plans = await service.findAll();
    expect(plans.map((p) => p.id)).toEqual(['free', 'pro', 'business']);
    expect(prisma.plan.findMany).toHaveBeenCalledWith({
      where: { isActive: true },
      orderBy: { priceMonthly: 'asc' },
    });
    expect(redis.set).toHaveBeenCalledWith(
      PLAN_CACHE_KEY,
      expect.stringContaining('"id":"pro"'),
      3600
    );
  });

  it('returns cached catalog without hitting Prisma', async () => {
    const cached = [mapPlanToPublicDto(PRO)];
    redis.get.mockResolvedValue(JSON.stringify(cached));
    const plans = await service.findAll();
    expect(plans).toEqual(cached);
    expect(prisma.plan.findMany).not.toHaveBeenCalled();
  });

  it('falls back to Prisma when Redis is unavailable', async () => {
    redis.get.mockRejectedValue(new Error('redis down'));
    redis.set.mockRejectedValue(new Error('redis down'));
    const plans = await service.findAll();
    expect(plans).toHaveLength(3);
    expect(prisma.plan.findMany).toHaveBeenCalled();
  });

  it('serves catalog fallback when the plans table is empty', async () => {
    prisma.plan.findMany.mockResolvedValue([]);
    const plans = await service.findAll();
    expect(plans.map((p) => p.id)).toEqual(['free', 'pro', 'business']);
    expect(plans[1]?.priceMonthly).toBe(9.99);
    expect(plans[1]?.priceAnnual).toBe(99);
    expect(plans[1]?.recommended).toBe(true);
    expect(plans[0]?.entitlements.find((e) => e.feature === 'cvLimit')?.value).toBe('1');
    expect(plans[1]?.entitlements.find((e) => e.feature === 'cvLimit')?.value).toBe('5');
    expect(plans[2]?.entitlements.find((e) => e.feature === 'cvLimit')?.value).toBe('20');
  });
});

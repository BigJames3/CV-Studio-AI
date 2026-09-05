import { PlansService } from './plans.service';
import { toCatalogPlan, STRIPE_TRIAL_DAYS } from './plan-catalog';

const FREE = {
  id: 'p-free',
  name: 'Free',
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
  id: 'p-pro',
  name: 'Pro',
  priceMonthly: 9.99,
  priceYearly: 99,
  cvLimit: 999999,
  aiFeatures: true,
  prioritySupport: true,
  customDomain: false,
  marketplaceAccess: true,
  apiAccess: false,
};

const BUSINESS = {
  id: 'p-biz',
  name: 'Business',
  priceMonthly: 29.99,
  priceYearly: 299,
  cvLimit: 999999,
  aiFeatures: true,
  prioritySupport: true,
  customDomain: true,
  marketplaceAccess: true,
  apiAccess: true,
};

describe('toCatalogPlan', () => {
  it('maps Free/Pro/Business with French names, prices, and entitlements', () => {
    const free = toCatalogPlan(FREE);
    const pro = toCatalogPlan(PRO);
    const business = toCatalogPlan(BUSINESS);

    expect(free).toMatchObject({
      slug: 'free',
      name: 'Gratuit',
      priceMonthly: 0,
      priceAnnual: null,
      trialDays: 0,
      recommended: false,
    });
    expect(pro).toMatchObject({
      slug: 'pro',
      name: 'Pro',
      priceMonthly: 9.99,
      priceYearly: 99,
      priceAnnual: 99,
      trialDays: STRIPE_TRIAL_DAYS,
      recommended: true,
      intervalSavings: { yearlyPercent: 17, yearlyAmountSaved: 20.88 },
    });
    expect(business).toMatchObject({
      slug: 'business',
      priceMonthly: 29.99,
      priceAnnual: 299,
    });

    expect(free?.entitlements).toEqual(
      expect.arrayContaining([
        { feature: 'cvLimit', value: '1' },
        { feature: 'downloadPdf', value: 'false' },
        { feature: 'share', value: 'false' },
      ])
    );
    expect(pro?.entitlements).toEqual(
      expect.arrayContaining([
        { feature: 'cvLimit', value: 'unlimited' },
        { feature: 'downloadPdf', value: 'true' },
        { feature: 'share', value: 'true' },
        { feature: 'proTemplates', value: 'false' },
      ])
    );
    expect(business?.entitlements.find((e) => e.feature === 'businessTemplates')?.value).toBe(
      'true'
    );

    const allFeatures = [free, pro, business].flatMap((p) => p?.entitlements.map((e) => e.feature));
    expect(allFeatures.some((f) => f?.toLowerCase().includes('docx'))).toBe(false);
  });

  it('ignores unknown plan names', () => {
    expect(toCatalogPlan({ ...PRO, name: 'Gold' })).toBeNull();
  });
});

describe('PlansService.findAll', () => {
  const prisma = { plan: { findMany: jest.fn() } };
  const redis = { get: jest.fn(), set: jest.fn() };
  let service: PlansService;

  beforeEach(() => {
    jest.clearAllMocks();
    redis.get.mockResolvedValue(null);
    redis.set.mockResolvedValue(undefined);
    prisma.plan.findMany.mockResolvedValue([FREE, PRO, BUSINESS]);
    service = new PlansService(prisma as never, redis as never);
  });

  it('returns ordered catalog items from the database', async () => {
    const { items } = await service.findAll();
    expect(items).toHaveLength(3);
    expect(items.map((p) => p.slug)).toEqual(['free', 'pro', 'business']);
    expect(prisma.plan.findMany).toHaveBeenCalledWith({
      where: { isActive: true },
      orderBy: { priceMonthly: 'asc' },
    });
    expect(redis.set).toHaveBeenCalled();
  });

  it('returns cached catalog when Redis has a hit', async () => {
    redis.get.mockResolvedValue(JSON.stringify({ items: [{ slug: 'pro', priceMonthly: 9.99 }] }));
    const { items } = await service.findAll();
    expect(items).toEqual([{ slug: 'pro', priceMonthly: 9.99 }]);
    expect(prisma.plan.findMany).not.toHaveBeenCalled();
  });

  it('falls through to the database when Redis is down', async () => {
    redis.get.mockRejectedValue(new Error('ECONNREFUSED'));
    const { items } = await service.findAll();
    expect(items).toHaveLength(3);
    expect(prisma.plan.findMany).toHaveBeenCalled();
  });
});

export const STRIPE_TRIAL_DAYS = 14;
export const PLANS_CACHE_KEY = 'plans:all';
export const PLANS_CACHE_TTL_SECONDS = 3600;

export type PlanSlug = 'free' | 'pro' | 'business';

export type PlanEntitlementDto = {
  feature: string;
  value: string;
};

export type CatalogPlanDto = {
  id: string;
  name: string;
  slug: PlanSlug;
  position: number;
  priceMonthly: number;
  priceYearly: number;
  priceAnnual: number | null;
  currency: 'USD';
  intervalSavings: { yearlyPercent: number; yearlyAmountSaved: number };
  trialDays: number;
  stripePriceMonthlyId: string | null;
  stripePriceAnnualId: string | null;
  features: {
    cvLimit: number;
    aiFeatures: boolean;
    prioritySupport: boolean;
    customDomain: boolean;
    marketplaceAccess: boolean;
    apiAccess: boolean;
  };
  entitlements: PlanEntitlementDto[];
  recommended: boolean;
};

export type PlanRecord = {
  id: string;
  name: string;
  priceMonthly: unknown;
  priceYearly: unknown;
  cvLimit: number;
  aiFeatures: boolean;
  prioritySupport: boolean;
  customDomain: boolean;
  marketplaceAccess: boolean;
  apiAccess: boolean;
};

const DISPLAY_NAME: Record<PlanSlug, string> = {
  free: 'Gratuit',
  pro: 'Pro',
  business: 'Business',
};

const POSITION: Record<PlanSlug, number> = {
  free: 0,
  pro: 1,
  business: 2,
};

function asSlug(name: string): PlanSlug | null {
  const slug = name.trim().toLowerCase();
  if (slug === 'free' || slug === 'pro' || slug === 'business') return slug;
  return null;
}

function stripePriceId(slug: PlanSlug, interval: 'MONTHLY' | 'YEARLY' | 'ANNUAL'): string | null {
  const key = `STRIPE_PRICE_${slug.toUpperCase()}_${interval}`;
  const value = process.env[key];
  return value && !value.includes('xxx') ? value : null;
}

function money(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Maps a DB plan row to the public catalog DTO.
 * Entitlements mirror FeatureGateService — never advertise unimplemented features (DOCX).
 */
export function toCatalogPlan(plan: PlanRecord): CatalogPlanDto | null {
  const slug = asSlug(plan.name);
  if (!slug) return null;

  const priceMonthly = money(plan.priceMonthly);
  const priceYearly = money(plan.priceYearly);
  const billedMonthly = Math.round(priceMonthly * 12 * 100) / 100;
  const yearlyAmountSaved = Math.max(0, Math.round((billedMonthly - priceYearly) * 100) / 100);
  const yearlyPercent =
    billedMonthly > 0 && yearlyAmountSaved > 0
      ? Math.round((yearlyAmountSaved / billedMonthly) * 100)
      : 0;

  const isPaid = slug !== 'free';
  const isBusiness = slug === 'business';
  const unlimited = plan.cvLimit >= 999;

  const entitlements: PlanEntitlementDto[] = [
    { feature: 'cvLimit', value: unlimited ? 'unlimited' : String(plan.cvLimit) },
    { feature: 'downloadPdf', value: isPaid ? 'true' : 'false' },
    { feature: 'share', value: isPaid ? 'true' : 'false' },
    { feature: 'aiFeatures', value: plan.aiFeatures ? 'true' : 'false' },
    { feature: 'proTemplates', value: isBusiness ? 'true' : 'false' },
    { feature: 'businessTemplates', value: isBusiness ? 'true' : 'false' },
    { feature: 'advancedFeatures', value: isPaid ? 'true' : 'false' },
  ];

  return {
    id: plan.id,
    name: DISPLAY_NAME[slug],
    slug,
    position: POSITION[slug],
    priceMonthly,
    priceYearly,
    priceAnnual: priceYearly > 0 ? priceYearly : null,
    currency: 'USD',
    intervalSavings: { yearlyPercent, yearlyAmountSaved },
    trialDays: isPaid ? STRIPE_TRIAL_DAYS : 0,
    stripePriceMonthlyId: isPaid ? stripePriceId(slug, 'MONTHLY') : null,
    stripePriceAnnualId: isPaid
      ? (stripePriceId(slug, 'YEARLY') ?? stripePriceId(slug, 'ANNUAL'))
      : null,
    features: {
      cvLimit: plan.cvLimit,
      aiFeatures: plan.aiFeatures,
      prioritySupport: plan.prioritySupport,
      customDomain: plan.customDomain,
      marketplaceAccess: plan.marketplaceAccess,
      apiAccess: plan.apiAccess,
    },
    entitlements,
    recommended: slug === 'pro',
  };
}

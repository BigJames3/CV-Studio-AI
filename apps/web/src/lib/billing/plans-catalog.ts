export type PlanSlug = 'free' | 'pro' | 'business';

export type PlanEntitlement = {
  feature: string;
  value: string;
};

export type CatalogPlan = {
  id: string;
  name: string;
  slug: PlanSlug;
  position?: number;
  priceMonthly: number;
  priceYearly: number;
  priceAnnual?: number | null;
  currency: 'USD';
  intervalSavings: { yearlyPercent: number; yearlyAmountSaved: number };
  trialDays?: number;
  stripePriceMonthlyId?: string | null;
  stripePriceAnnualId?: string | null;
  features: {
    cvLimit: number;
    aiFeatures: boolean;
    prioritySupport: boolean;
    customDomain: boolean;
    marketplaceAccess: boolean;
    apiAccess: boolean;
  };
  entitlements?: PlanEntitlement[];
  recommended: boolean;
};

const FREE_ENTITLEMENTS: PlanEntitlement[] = [
  { feature: 'cvLimit', value: '1' },
  { feature: 'downloadPdf', value: 'false' },
  { feature: 'share', value: 'false' },
  { feature: 'aiFeatures', value: 'false' },
  { feature: 'proTemplates', value: 'false' },
  { feature: 'businessTemplates', value: 'false' },
  { feature: 'advancedFeatures', value: 'false' },
];

const PRO_ENTITLEMENTS: PlanEntitlement[] = [
  { feature: 'cvLimit', value: 'unlimited' },
  { feature: 'downloadPdf', value: 'true' },
  { feature: 'share', value: 'true' },
  { feature: 'aiFeatures', value: 'true' },
  { feature: 'proTemplates', value: 'false' },
  { feature: 'businessTemplates', value: 'false' },
  { feature: 'advancedFeatures', value: 'true' },
];

const BUSINESS_ENTITLEMENTS: PlanEntitlement[] = [
  { feature: 'cvLimit', value: 'unlimited' },
  { feature: 'downloadPdf', value: 'true' },
  { feature: 'share', value: 'true' },
  { feature: 'aiFeatures', value: 'true' },
  { feature: 'proTemplates', value: 'true' },
  { feature: 'businessTemplates', value: 'true' },
  { feature: 'advancedFeatures', value: 'true' },
];

/** Seed-aligned fallback so billing/pricing never go blank if GET /plans fails. */
export const FALLBACK_PLANS: CatalogPlan[] = [
  {
    id: 'fallback-free',
    name: 'Gratuit',
    slug: 'free',
    position: 0,
    priceMonthly: 0,
    priceYearly: 0,
    priceAnnual: null,
    currency: 'USD',
    intervalSavings: { yearlyPercent: 0, yearlyAmountSaved: 0 },
    trialDays: 0,
    features: {
      cvLimit: 1,
      aiFeatures: false,
      prioritySupport: false,
      customDomain: false,
      marketplaceAccess: false,
      apiAccess: false,
    },
    entitlements: FREE_ENTITLEMENTS,
    recommended: false,
  },
  {
    id: 'fallback-pro',
    name: 'Pro',
    slug: 'pro',
    position: 1,
    priceMonthly: 9.99,
    priceYearly: 99,
    priceAnnual: 99,
    currency: 'USD',
    intervalSavings: { yearlyPercent: 17, yearlyAmountSaved: 20.88 },
    trialDays: 14,
    features: {
      cvLimit: 999999,
      aiFeatures: true,
      prioritySupport: true,
      customDomain: false,
      marketplaceAccess: true,
      apiAccess: false,
    },
    entitlements: PRO_ENTITLEMENTS,
    recommended: true,
  },
  {
    id: 'fallback-business',
    name: 'Business',
    slug: 'business',
    position: 2,
    priceMonthly: 29.99,
    priceYearly: 299,
    priceAnnual: 299,
    currency: 'USD',
    intervalSavings: { yearlyPercent: 17, yearlyAmountSaved: 60.88 },
    trialDays: 14,
    features: {
      cvLimit: 999999,
      aiFeatures: true,
      prioritySupport: true,
      customDomain: true,
      marketplaceAccess: true,
      apiAccess: true,
    },
    entitlements: BUSINESS_ENTITLEMENTS,
    recommended: false,
  },
];

export const PLAN_DISPLAY_NAME: Record<PlanSlug, string> = {
  free: 'Gratuit',
  pro: 'Pro',
  business: 'Business',
};

export function mergeCatalog(items?: CatalogPlan[] | null): CatalogPlan[] {
  return FALLBACK_PLANS.map((fallback) => {
    const fromApi = items?.find((item) => item.slug === fallback.slug);
    return fromApi ?? fallback;
  });
}

export function formatUsdFr(amount: number): string {
  if (!Number.isFinite(amount)) return '— $';
  const formatted = amount.toLocaleString('fr-FR', {
    minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  });
  return `${formatted} $`;
}

export function yearlySavingsLabel(plan: CatalogPlan): string | null {
  if (plan.intervalSavings.yearlyPercent <= 0) return null;
  return `Économisez ${plan.intervalSavings.yearlyPercent}% (2 mois offerts)`;
}

export type MatrixCell = { label: string; included: boolean; detail?: string };

export function formatFeatureName(feature: string, value?: string): string {
  const labels: Record<string, string> = {
    cvLimit: value === 'unlimited' ? 'CVs illimités' : `Créer ${value ?? '1'} CV`,
    downloadPdf: 'Télécharger en PDF',
    share: 'Partager des CVs',
    aiFeatures: 'Optimisation IA',
    proTemplates: 'Templates Pro',
    businessTemplates: 'Templates Business',
    advancedFeatures: 'Fonctionnalités avancées',
  };
  return labels[feature] ?? feature;
}

export function isEntitlementIncluded(feature: string, value: string): boolean {
  if (feature === 'cvLimit') return true;
  return value === 'true' || value === 'unlimited';
}

export function planMatrixRows(plan: CatalogPlan): MatrixCell[] {
  if (plan.entitlements?.length) {
    return plan.entitlements.map((ent) => ({
      label: formatFeatureName(ent.feature, ent.value),
      included: isEntitlementIncluded(ent.feature, ent.value),
    }));
  }

  const unlimited = plan.features.cvLimit >= 999;
  const isPaid = plan.slug !== 'free';
  const isBusiness = plan.slug === 'business';
  return [
    {
      label: unlimited ? 'CVs illimités' : 'Créer 1 CV',
      included: true,
    },
    { label: 'Télécharger en PDF', included: isPaid },
    { label: 'Partager des CVs', included: isPaid },
    { label: 'Optimisation IA', included: plan.features.aiFeatures },
    { label: 'Templates Pro', included: isBusiness },
    { label: 'Templates Business', included: isBusiness },
    { label: 'Fonctionnalités avancées', included: isPaid },
  ];
}

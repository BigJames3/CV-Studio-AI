export type BillingPlanSlug = 'free' | 'pro' | 'business';

export type BillingCatalogEntitlement = {
  feature: string;
  value: string;
  included: boolean;
};

export type PublicBillingPlan = {
  id: BillingPlanSlug;
  name: string;
  description: string;
  position: number;
  priceMonthly: number;
  priceAnnual: number | null;
  currency: 'EUR';
  trialDays: number | null;
  recommended: boolean;
  stripePriceMonthlyId: string | null;
  stripePriceAnnualId: string | null;
  entitlements: BillingCatalogEntitlement[];
};

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
  /** ISO 4217 code of what is charged (XOF with Paystack in Côte d'Ivoire). */
  currency: string;
  trialDays: number | null;
  recommended: boolean;
  entitlements: BillingCatalogEntitlement[];
};

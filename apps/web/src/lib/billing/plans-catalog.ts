import type { PublicBillingPlan } from '@cvstudio/shared-types';

export const SUPPORT_BUSINESS_MAILTO =
  'mailto:support@cvstudio.ai?subject=Support%20Business%20-%20CV%20Studio';

export type BillingPlan = PublicBillingPlan;

export const FALLBACK_PLANS: BillingPlan[] = [
  {
    id: 'free',
    name: 'Gratuit',
    description: '1 CV, 5 templates, PDF export, no AI',
    position: 0,
    priceMonthly: 0,
    priceAnnual: null,
    currency: 'EUR',
    trialDays: null,
    recommended: false,
    stripePriceMonthlyId: null,
    stripePriceAnnualId: null,
    entitlements: [
      { feature: 'cvLimit', value: '1', included: true },
      { feature: 'downloadPdf', value: 'true', included: true },
      { feature: 'share', value: 'true', included: true },
      { feature: 'aiFeatures', value: 'false', included: false },
      { feature: 'templates', value: '5', included: true },
      { feature: 'collaborate', value: 'false', included: false },
      { feature: 'apiAccess', value: 'false', included: false },
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    description: 'Unlimited CVs',
    position: 1,
    priceMonthly: 9.99,
    priceAnnual: 99,
    currency: 'EUR',
    trialDays: 14,
    recommended: true,
    stripePriceMonthlyId: null,
    stripePriceAnnualId: null,
    entitlements: [
      { feature: 'cvLimit', value: 'unlimited', included: true },
      { feature: 'downloadPdf', value: 'true', included: true },
      { feature: 'share', value: 'true', included: true },
      { feature: 'aiFeatures', value: 'true', included: true },
      { feature: 'templates', value: 'unlimited', included: true },
      { feature: 'collaborate', value: 'false', included: false },
      { feature: 'apiAccess', value: 'false', included: false },
    ],
  },
  {
    id: 'business',
    name: 'Business',
    description: 'Teams',
    position: 2,
    priceMonthly: 29.99,
    priceAnnual: 299,
    currency: 'EUR',
    trialDays: 14,
    recommended: false,
    stripePriceMonthlyId: null,
    stripePriceAnnualId: null,
    entitlements: [
      { feature: 'cvLimit', value: 'unlimited', included: true },
      { feature: 'downloadPdf', value: 'true', included: true },
      { feature: 'share', value: 'true', included: true },
      { feature: 'aiFeatures', value: 'true', included: true },
      { feature: 'templates', value: 'unlimited', included: true },
      { feature: 'collaborate', value: 'true', included: true },
      { feature: 'apiAccess', value: 'true', included: true },
    ],
  },
];

export function formatPlanPrice(amount: number, currency = 'EUR'): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency,
    minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatFeatureName(ent: BillingPlan['entitlements'][number]): string {
  const labels: Record<string, string> = {
    cvLimit: ent.value === 'unlimited' ? 'CVs illimités' : `Créer ${ent.value} CV`,
    downloadPdf: 'Télécharger en PDF',
    share: 'Partager des CV',
    aiFeatures: 'Optimisation IA',
    templates: ent.value === 'unlimited' ? 'Templates illimités' : `${ent.value} templates`,
    collaborate: "Collaboration d'équipe",
    prioritySupport: 'Support prioritaire',
    customDomain: 'Domaine personnalisé',
    marketplaceAccess: 'Accès marketplace',
    apiAccess: 'Accès API',
  };
  return labels[ent.feature] ?? ent.feature;
}

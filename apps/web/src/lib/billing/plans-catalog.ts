import type { PublicBillingPlan } from '@cvstudio/shared-types';

export const SUPPORT_BUSINESS_MAILTO =
  'mailto:support@cvstudio.ai?subject=Support%20Business%20-%20CV%20Studio';

export type BillingPlan = PublicBillingPlan;

export const FALLBACK_PLANS: BillingPlan[] = [
  {
    id: 'free',
    name: 'Gratuit',
    description: '1 CV, 4 templates, ATS score, no PDF export, no AI optimization',
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
      { feature: 'downloadPdf', value: 'false', included: false },
      { feature: 'share', value: 'false', included: false },
      { feature: 'aiFeatures', value: 'false', included: false },
      { feature: 'atsCheck', value: 'true', included: true },
      { feature: 'templates', value: '4', included: true },
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    description: '5 CVs, unlimited templates, AI optimization, ATS check',
    position: 1,
    priceMonthly: 9.99,
    priceAnnual: 99,
    currency: 'EUR',
    trialDays: 14,
    recommended: true,
    stripePriceMonthlyId: null,
    stripePriceAnnualId: null,
    entitlements: [
      { feature: 'cvLimit', value: '5', included: true },
      { feature: 'downloadPdf', value: 'true', included: true },
      { feature: 'share', value: 'true', included: true },
      { feature: 'aiFeatures', value: 'true', included: true },
      { feature: 'atsCheck', value: 'true', included: true },
      { feature: 'templates', value: 'unlimited', included: true },
    ],
  },
  {
    id: 'business',
    name: 'Business',
    description: '20 CVs, everything in Pro',
    position: 2,
    priceMonthly: 29.99,
    priceAnnual: 299,
    currency: 'EUR',
    trialDays: 14,
    recommended: false,
    stripePriceMonthlyId: null,
    stripePriceAnnualId: null,
    entitlements: [
      { feature: 'cvLimit', value: '20', included: true },
      { feature: 'downloadPdf', value: 'true', included: true },
      { feature: 'share', value: 'true', included: true },
      { feature: 'aiFeatures', value: 'true', included: true },
      { feature: 'atsCheck', value: 'true', included: true },
      { feature: 'templates', value: 'unlimited', included: true },
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
    cvLimit:
      ent.value === 'unlimited'
        ? 'CVs illimités'
        : `Créer ${ent.value} CV${ent.value === '1' ? '' : 's'}`,
    downloadPdf: 'Télécharger en PDF',
    share: 'Partager des CV',
    aiFeatures: 'Optimisation IA',
    atsCheck: 'Score ATS',
    templates: ent.value === 'unlimited' ? 'Templates illimités' : `${ent.value} templates`,
    prioritySupport: 'Support prioritaire',
    marketplaceAccess: 'Accès marketplace',
  };
  return labels[ent.feature] ?? ent.feature;
}

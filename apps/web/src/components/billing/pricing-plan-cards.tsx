'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { plansApi, queryKeys } from '@/lib/api';
import {
  FALLBACK_PLANS,
  SUPPORT_BUSINESS_MAILTO,
  formatFeatureName,
  formatPlanPrice,
} from '@/lib/billing/plans-catalog';
import { cn } from '@/lib/utils';

export function PricingPlanCards() {
  const { data } = useQuery({
    queryKey: queryKeys.plans,
    queryFn: () => plansApi.list(),
    staleTime: 1000 * 60 * 60,
    placeholderData: FALLBACK_PLANS,
  });
  const plans = [...(data && data.length > 0 ? data : FALLBACK_PLANS)].sort(
    (a, b) => a.position - b.position
  );

  return (
    <div className="mt-12 grid gap-6 md:grid-cols-3">
      {plans.map((plan) => {
        const isRecommended = plan.recommended || plan.id === 'pro';
        const currency = plan.currency || 'EUR';
        const annualSavings =
          plan.priceAnnual && plan.priceMonthly > 0
            ? Math.round((plan.priceMonthly * 12 - plan.priceAnnual) * 100) / 100
            : 0;

        return (
          <div
            key={plan.id}
            data-testid={`pricing-plan-${plan.id}`}
            className={cn(
              'relative rounded-lg border border-border bg-surface-card p-6 shadow-1',
              isRecommended ? 'ring-2 ring-primary' : ''
            )}
          >
            {isRecommended ? (
              <span className="absolute -top-3 left-4 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-white">
                Recommandé
              </span>
            ) : null}
            <h2 className="text-xl font-semibold">{plan.name}</h2>
            <p className="mt-2 text-3xl font-semibold" data-testid={`pricing-price-${plan.id}`}>
              {plan.priceMonthly <= 0
                ? 'Gratuit'
                : `${formatPlanPrice(plan.priceMonthly, currency)}/mois`}
            </p>
            {plan.priceAnnual ? (
              <p className="mt-1 text-sm text-content-secondary">
                ou {formatPlanPrice(plan.priceAnnual, currency)}/an
                {annualSavings > 0
                  ? ` — Économies : ${formatPlanPrice(annualSavings, currency)}/an`
                  : ''}
              </p>
            ) : null}
            {plan.trialDays ? (
              <p className="mt-1 text-sm text-content-secondary">{plan.trialDays} jours gratuits</p>
            ) : null}
            <ul className="mt-6 space-y-2 text-sm">
              {plan.entitlements.map((ent) => (
                <li key={ent.feature} className="flex items-start gap-2">
                  {ent.included ? (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden />
                  ) : (
                    <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-content-muted" aria-hidden />
                  )}
                  <span
                    className={
                      ent.included ? 'text-content-secondary' : 'text-content-muted line-through'
                    }
                  >
                    {formatFeatureName(ent)}
                  </span>
                </li>
              ))}
            </ul>
            {plan.id === 'business' ? (
              <a
                href={SUPPORT_BUSINESS_MAILTO}
                data-testid={`pricing-cta-${plan.id}`}
                className="mt-8 inline-flex min-h-10 w-full items-center justify-center rounded-md border border-border bg-transparent px-4 text-sm font-medium text-content-primary hover:bg-[color:var(--cv-color-neutral-100)]"
              >
                Contactez le support
              </a>
            ) : (
              <Link href="/register" className="mt-8 block">
                <Button
                  className="w-full"
                  variant={isRecommended ? 'primary' : 'secondary'}
                  data-testid={`pricing-cta-${plan.id}`}
                >
                  {plan.id === 'free' ? 'Commencer gratuitement' : `Passer à ${plan.name}`}
                </Button>
              </Link>
            )}
          </div>
        );
      })}
    </div>
  );
}

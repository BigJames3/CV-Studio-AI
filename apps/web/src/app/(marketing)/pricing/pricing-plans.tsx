'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { queryKeys, plansApi } from '@/lib/api';
import {
  FALLBACK_PLANS,
  formatUsdFr,
  mergeCatalog,
  planMatrixRows,
  yearlySavingsLabel,
  type CatalogPlan,
} from '@/lib/billing/plans-catalog';

const CTA: Record<CatalogPlan['slug'], string> = {
  free: '/register',
  pro: '/register',
  business: '/register',
};

export function PricingPlans() {
  const { data } = useQuery({
    queryKey: queryKeys.plans,
    queryFn: plansApi.list,
    staleTime: 60 * 60 * 1000,
    initialData: { items: FALLBACK_PLANS },
  });
  const plans = mergeCatalog(data.items);

  return (
    <div className="mt-12 grid gap-6 md:grid-cols-3">
      {plans.map((plan) => {
        const savings = yearlySavingsLabel(plan);
        return (
          <div
            key={plan.slug}
            data-testid={`pricing-plan-${plan.slug}`}
            className={`rounded-lg border border-border bg-surface-card p-6 shadow-1 ${
              plan.recommended ? 'ring-2 ring-primary' : ''
            }`}
          >
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-semibold">{plan.name}</h2>
              {plan.recommended ? <Badge>Recommandé</Badge> : null}
            </div>
            <p className="mt-2 text-3xl font-semibold">
              {plan.priceMonthly === 0 ? 'Gratuit' : `${formatUsdFr(plan.priceMonthly)}/mois`}
            </p>
            {plan.priceYearly > 0 ? (
              <p className="mt-1 text-sm text-content-secondary">
                {formatUsdFr(plan.priceYearly)} / an
                {savings ? ` — ${savings}` : ''}
              </p>
            ) : null}
            <ul className="mt-6 space-y-2 text-sm text-content-secondary">
              {planMatrixRows(plan).map((row) => (
                <li key={row.label}>
                  {row.included ? '✓' : '—'} {row.label}
                  {row.detail ? ` (${row.detail})` : ''}
                </li>
              ))}
            </ul>
            <Link href={CTA[plan.slug]} className="mt-8 block">
              <Button
                className="w-full"
                variant={plan.recommended ? 'primary' : 'secondary'}
                data-testid={`pricing-cta-${plan.slug}`}
              >
                Commencer
              </Button>
            </Link>
          </div>
        );
      })}
    </div>
  );
}

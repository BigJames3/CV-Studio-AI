'use client';

import { CheckCircle2, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  formatUsdFr,
  planMatrixRows,
  yearlySavingsLabel,
  type CatalogPlan,
  type PlanSlug,
} from '@/lib/billing/plans-catalog';

export type BillingPeriod = 'month' | 'year';

type PlanCardsProps = {
  catalog: CatalogPlan[];
  loading?: boolean;
  displayTier: PlanSlug;
  billingPeriod: BillingPeriod;
  onBillingPeriodChange: (period: BillingPeriod) => void;
  checkoutPending: 'pro' | 'business' | null;
  onCheckout: (plan: 'pro' | 'business', interval: BillingPeriod) => void;
};

function PlanCardsSkeleton() {
  return (
    <div className="mt-6 grid gap-4 sm:grid-cols-3" aria-hidden>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="h-72 animate-pulse rounded-lg border border-border bg-surface-app"
        />
      ))}
    </div>
  );
}

function displayPrice(plan: CatalogPlan, period: BillingPeriod): number | null {
  if (plan.priceMonthly === 0) return 0;
  if (period === 'year') {
    const annual = plan.priceAnnual ?? plan.priceYearly;
    return annual > 0 ? annual : plan.priceMonthly;
  }
  return plan.priceMonthly;
}

function annualSavings(plan: CatalogPlan): string | null {
  const annual = plan.priceAnnual ?? plan.priceYearly;
  if (annual <= 0 || plan.priceMonthly <= 0) return null;
  const saved = Math.round((plan.priceMonthly * 12 - annual) * 100) / 100;
  if (saved <= 0) return null;
  return formatUsdFr(saved);
}

export function BillingPlanCards({
  catalog,
  loading,
  displayTier,
  billingPeriod,
  onBillingPeriodChange,
  checkoutPending,
  onCheckout,
}: PlanCardsProps) {
  const hasAnnual = catalog.some((p) => (p.priceAnnual ?? p.priceYearly) > 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-xl font-semibold">Plans et tarification</h2>
        <div
          className="flex gap-1 rounded-md bg-surface-app p-1"
          data-testid="billing-period-toggle"
          role="group"
          aria-label="Période de facturation"
        >
          <button
            type="button"
            onClick={() => onBillingPeriodChange('month')}
            className={cn(
              'rounded px-4 py-2 text-sm font-medium transition',
              billingPeriod === 'month'
                ? 'bg-surface-card text-content-primary shadow-1'
                : 'text-content-secondary hover:text-content-primary'
            )}
          >
            Mensuel
          </button>
          <button
            type="button"
            onClick={() => onBillingPeriodChange('year')}
            className={cn(
              'rounded px-4 py-2 text-sm font-medium transition',
              billingPeriod === 'year'
                ? 'bg-surface-card text-content-primary shadow-1'
                : 'text-content-secondary hover:text-content-primary'
            )}
          >
            Annuel
            {hasAnnual ? (
              <span className="ml-2 rounded bg-[color:var(--cv-color-success-subtle)] px-2 py-0.5 text-xs text-success">
                Économies
              </span>
            ) : null}
          </button>
        </div>
      </div>

      {loading ? (
        <PlanCardsSkeleton />
      ) : (
        <div className="grid gap-4 sm:grid-cols-3">
          {catalog.map((plan) => {
            const active = displayTier === plan.slug;
            const savings = yearlySavingsLabel(plan);
            const price = displayPrice(plan, billingPeriod);
            const monthlyEquivalent =
              billingPeriod === 'year' && (plan.priceAnnual ?? plan.priceYearly) > 0
                ? (plan.priceAnnual ?? plan.priceYearly) / 12
                : plan.priceMonthly;
            const savedAmount = billingPeriod === 'year' ? annualSavings(plan) : null;

            return (
              <div
                key={plan.slug}
                data-testid={`billing-plan-${plan.slug}`}
                className={cn(
                  'relative flex flex-col rounded-lg border p-4',
                  active ? 'border-primary bg-primary-subtle' : 'border-border bg-surface-app',
                  plan.recommended && !active ? 'ring-2 ring-primary' : ''
                )}
              >
                {plan.recommended && !active ? (
                  <div className="absolute -top-3 left-4">
                    <Badge>Recommandé</Badge>
                  </div>
                ) : null}

                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold">{plan.name}</p>
                  {plan.recommended && active ? <Badge>Recommandé</Badge> : null}
                  {active ? <p className="text-xs font-medium text-primary">Actuel</p> : null}
                </div>

                <div className="mt-3">
                  {price === 0 ? (
                    <p className="text-2xl font-semibold">Gratuit</p>
                  ) : (
                    <>
                      <p className="text-3xl font-semibold">
                        {formatUsdFr(price ?? 0)}
                        <span className="ml-1 text-sm font-normal text-content-secondary">
                          {billingPeriod === 'month' ? '/mois' : '/an'}
                        </span>
                      </p>
                      {billingPeriod === 'year' && monthlyEquivalent > 0 ? (
                        <p className="mt-1 text-xs text-content-secondary">
                          Soit {formatUsdFr(monthlyEquivalent)}/mois
                        </p>
                      ) : null}
                      {savedAmount ? (
                        <p className="mt-2 inline-block rounded bg-[color:var(--cv-color-success-subtle)] px-2 py-1 text-xs text-success">
                          Économies : {savedAmount}/an
                        </p>
                      ) : null}
                    </>
                  )}
                  {billingPeriod === 'month' && plan.priceYearly > 0 ? (
                    <p className="mt-1 text-sm text-content-secondary">
                      {formatUsdFr(plan.priceYearly)} / an
                      {savings ? (
                        <span className="mt-0.5 block text-xs text-primary">{savings}</span>
                      ) : null}
                    </p>
                  ) : null}
                </div>

                <ul className="mt-4 flex-1 space-y-2 text-sm">
                  {planMatrixRows(plan).map((row) => (
                    <li key={row.label} className="flex items-start gap-2">
                      {row.included ? (
                        <CheckCircle2
                          className="mt-0.5 h-4 w-4 shrink-0 text-success"
                          aria-hidden
                        />
                      ) : (
                        <XCircle
                          className="mt-0.5 h-4 w-4 shrink-0 text-content-muted"
                          aria-hidden
                        />
                      )}
                      <span className={row.included ? '' : 'text-content-muted'}>
                        {row.label}
                        {row.detail ? ` · ${row.detail}` : ''}
                      </span>
                    </li>
                  ))}
                </ul>

                <div className="mt-6 flex flex-col gap-2">
                  {active ? (
                    <Button type="button" variant="outline" disabled className="w-full">
                      Plan actuel
                    </Button>
                  ) : null}

                  {plan.slug === 'pro' && displayTier === 'free' ? (
                    <>
                      <Button
                        data-testid="checkout-pro-month"
                        data-plan="pro"
                        disabled={checkoutPending !== null}
                        className="w-full"
                        variant={billingPeriod === 'month' ? 'primary' : 'secondary'}
                        onClick={() => onCheckout('pro', 'month')}
                      >
                        {checkoutPending === 'pro'
                          ? 'Redirection…'
                          : `Passer à Pro — ${formatUsdFr(plan.priceMonthly)}/mois`}
                      </Button>
                      <Button
                        variant={billingPeriod === 'year' ? 'primary' : 'outline'}
                        data-testid="checkout-pro-year"
                        data-plan="pro"
                        disabled={checkoutPending !== null}
                        className="w-full"
                        onClick={() => onCheckout('pro', 'year')}
                      >
                        {`Pro annuel — ${formatUsdFr(plan.priceYearly)}`}
                      </Button>
                    </>
                  ) : null}

                  {plan.slug === 'business' && displayTier !== 'business' ? (
                    <>
                      <Button
                        variant={
                          displayTier === 'pro' || billingPeriod === 'month' ? 'primary' : 'outline'
                        }
                        data-testid="checkout-business-month"
                        data-plan="business"
                        disabled={checkoutPending !== null}
                        className="w-full"
                        onClick={() => onCheckout('business', 'month')}
                      >
                        {checkoutPending === 'business'
                          ? 'Redirection…'
                          : `Passer à Business — ${formatUsdFr(plan.priceMonthly)}/mois`}
                      </Button>
                      <Button
                        variant={billingPeriod === 'year' ? 'primary' : 'outline'}
                        data-testid="checkout-business-year"
                        data-plan="business"
                        disabled={checkoutPending !== null}
                        className="w-full"
                        onClick={() => onCheckout('business', 'year')}
                      >
                        {`Business annuel — ${formatUsdFr(plan.priceYearly)}`}
                      </Button>
                    </>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

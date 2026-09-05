'use client';

import { CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { BillingPlan } from '@/lib/api';
import {
  SUPPORT_BUSINESS_MAILTO,
  formatFeatureName,
  formatPlanPrice,
} from '@/lib/billing/plans-catalog';

const TIER_RANK: Record<string, number> = { free: 0, pro: 1, business: 2 };

export { formatFeatureName, formatPlanPrice };

export function PlanGrid({
  plans,
  currentTier,
  billingPeriod,
  checkoutPending,
  onPeriodChange,
  onCheckout,
}: {
  plans: BillingPlan[];
  currentTier: string;
  billingPeriod: 'month' | 'year';
  checkoutPending: 'pro' | 'business' | null;
  onPeriodChange: (period: 'month' | 'year') => void;
  onCheckout: (plan: 'pro' | 'business', interval: 'month' | 'year') => void;
}) {
  const sortedPlans = [...plans].sort((a, b) => a.position - b.position);
  const hasAnnual = sortedPlans.some((plan) => plan.priceAnnual && plan.priceAnnual > 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">Plans et tarification</h2>
        {hasAnnual ? (
          <div className="flex rounded-lg border border-border bg-surface-app p-1">
            <button
              type="button"
              data-testid="billing-period-month"
              onClick={() => onPeriodChange('month')}
              className={cn(
                'rounded-md px-3 py-1.5 text-sm font-medium transition',
                billingPeriod === 'month'
                  ? 'bg-surface-card text-content-primary shadow-1'
                  : 'text-content-secondary hover:text-content-primary'
              )}
            >
              Mensuel
            </button>
            <button
              type="button"
              data-testid="billing-period-year"
              onClick={() => onPeriodChange('year')}
              className={cn(
                'rounded-md px-3 py-1.5 text-sm font-medium transition',
                billingPeriod === 'year'
                  ? 'bg-surface-card text-content-primary shadow-1'
                  : 'text-content-secondary hover:text-content-primary'
              )}
            >
              Annuel
              <span className="ml-2 rounded-full bg-[color:var(--cv-color-success-subtle)] px-2 py-0.5 text-xs text-success">
                Économies
              </span>
            </button>
          </div>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {sortedPlans.map((plan) => {
          const isCurrent = currentTier === plan.id;
          const isRecommended = plan.recommended || plan.id === 'pro';
          const isPaid = plan.priceMonthly > 0;
          const displayPrice =
            billingPeriod === 'year' && plan.priceAnnual != null
              ? plan.priceAnnual
              : plan.priceMonthly;
          const annualSavings =
            billingPeriod === 'year' && plan.priceAnnual
              ? Math.round((plan.priceMonthly * 12 - plan.priceAnnual) * 100) / 100
              : null;
          const monthlyEquivalent =
            billingPeriod === 'year' && plan.priceAnnual ? plan.priceAnnual / 12 : null;
          const canUpgrade = !isCurrent && TIER_RANK[plan.id] > (TIER_RANK[currentTier] ?? 0);
          const pending = checkoutPending === plan.id;
          const currency = plan.currency || 'EUR';

          return (
            <div
              key={plan.id}
              data-testid={`billing-plan-${plan.id}`}
              className={cn(
                'relative flex flex-col rounded-lg border p-5',
                isCurrent
                  ? 'border-primary bg-primary-subtle ring-2 ring-primary'
                  : isRecommended
                    ? 'border-primary bg-surface-card ring-2 ring-primary/40'
                    : 'border-border bg-surface-app'
              )}
            >
              {isRecommended ? (
                <span className="absolute -top-3 left-4 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-white">
                  Recommandé
                </span>
              ) : null}

              <p className="mt-1 font-semibold">{plan.name}</p>

              <div className="mt-3" data-testid={`plan-price-${plan.id}`}>
                {!isPaid || displayPrice === 0 ? (
                  <p className="text-2xl font-semibold">Gratuit</p>
                ) : (
                  <>
                    <p className="text-3xl font-semibold">
                      {formatPlanPrice(displayPrice, currency)}
                      <span className="ml-1 text-sm font-normal text-content-secondary">
                        {billingPeriod === 'month' ? '/mois' : '/an'}
                      </span>
                    </p>
                    {monthlyEquivalent != null ? (
                      <p className="mt-1 text-xs text-content-secondary">
                        Soit {formatPlanPrice(monthlyEquivalent, currency)}/mois
                      </p>
                    ) : null}
                    {annualSavings != null && annualSavings > 0 ? (
                      <p
                        className="mt-2 inline-block rounded-full bg-[color:var(--cv-color-success-subtle)] px-2 py-1 text-xs font-medium text-success"
                        data-testid={`plan-savings-${plan.id}`}
                      >
                        Économies : {formatPlanPrice(annualSavings, currency)}/an
                      </p>
                    ) : null}
                    {plan.trialDays ? (
                      <p className="mt-2 text-xs text-content-secondary">
                        {plan.trialDays} jours gratuits
                      </p>
                    ) : null}
                  </>
                )}
              </div>

              <ul className="mt-4 flex-1 space-y-2" data-testid={`plan-features-${plan.id}`}>
                {plan.entitlements.map((ent) => (
                  <li key={ent.feature} className="flex items-start gap-2 text-sm">
                    {ent.included ? (
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden />
                    ) : (
                      <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-content-muted" aria-hidden />
                    )}
                    <span
                      className={
                        ent.included ? 'text-content-primary' : 'text-content-muted line-through'
                      }
                    >
                      {formatFeatureName(ent)}
                    </span>
                  </li>
                ))}
              </ul>

              <div className="mt-5">
                {isCurrent ? (
                  <Button className="w-full" variant="secondary" disabled>
                    Plan actuel
                  </Button>
                ) : plan.id === 'business' ? (
                  <a
                    href={SUPPORT_BUSINESS_MAILTO}
                    data-testid="billing-business-support"
                    className="inline-flex min-h-10 w-full items-center justify-center rounded-md border border-border bg-transparent px-4 text-sm font-medium text-content-primary hover:bg-[color:var(--cv-color-neutral-100)]"
                  >
                    Contactez le support
                  </a>
                ) : canUpgrade && plan.id === 'pro' ? (
                  <Button
                    className="w-full"
                    data-testid={`checkout-${plan.id}-${billingPeriod}`}
                    data-plan={plan.id}
                    disabled={checkoutPending !== null}
                    onClick={() => onCheckout('pro', billingPeriod)}
                  >
                    {pending ? 'Redirection…' : `Passer à ${plan.name}`}
                  </Button>
                ) : (
                  <Button className="w-full" variant="outline" disabled>
                    Inclus
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function BillingPlansSkeleton() {
  return (
    <div className="grid animate-pulse gap-4 sm:grid-cols-3">
      {[0, 1, 2].map((i) => (
        <div key={i} className="space-y-4 rounded-lg border border-border p-5">
          <div className="h-5 w-2/3 rounded bg-surface-app" />
          <div className="h-8 w-1/2 rounded bg-surface-app" />
          <div className="space-y-2">
            <div className="h-4 rounded bg-surface-app" />
            <div className="h-4 rounded bg-surface-app" />
            <div className="h-4 rounded bg-surface-app" />
          </div>
          <div className="h-10 rounded bg-surface-app" />
        </div>
      ))}
    </div>
  );
}

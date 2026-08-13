'use client';

import Link from 'next/link';
import {
  useAdminMetrics,
  useAdminRevenueHistory,
  useAdminFunnel,
  useAdminCohort,
  useAdminCac,
  useAdminLtv,
} from '@/hooks';
import { ApiError } from '@/lib/api/client';
import { cn } from '@/lib/utils';

function formatMoney(amount: number) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

function MetricCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface-card p-4">
      <p className="text-sm text-content-secondary">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
      {hint ? <p className="mt-1 text-xs text-content-muted">{hint}</p> : null}
    </div>
  );
}

function RevenueBars({ items }: { items: Array<{ month: string; revenue: number }> }) {
  const max = Math.max(...items.map((i) => i.revenue), 1);

  return (
    <div className="mt-4 flex h-48 items-end gap-2" data-testid="revenue-bars">
      {items.map((item) => {
        const heightPct = Math.max(4, Math.round((item.revenue / max) * 100));
        return (
          <div key={item.month} className="flex min-w-0 flex-1 flex-col items-center gap-2">
            <div
              className="w-full rounded-t bg-primary/80"
              style={{ height: `${heightPct}%` }}
              title={formatMoney(item.revenue)}
            />
            <span className="truncate text-[10px] text-content-muted">{item.month}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function AdminAnalyticsPage() {
  const metricsQuery = useAdminMetrics();
  const revenueQuery = useAdminRevenueHistory(12);
  const funnelQuery = useAdminFunnel();
  const cohortQuery = useAdminCohort(12);
  const cacQuery = useAdminCac();
  const ltvQuery = useAdminLtv();

  const forbidden =
    (metricsQuery.error instanceof ApiError && metricsQuery.error.status === 403) ||
    (revenueQuery.error instanceof ApiError && revenueQuery.error.status === 403) ||
    (funnelQuery.error instanceof ApiError && funnelQuery.error.status === 403);

  if (forbidden) {
    return (
      <div className="mx-auto max-w-content px-4 py-16 text-center">
        <h1 className="text-2xl font-semibold">Accès refusé</h1>
        <p className="mt-2 text-sm text-content-secondary">
          Cette page est réservée aux administrateurs. Configurez{' '}
          <code className="text-xs">ADMIN_EMAILS</code> côté API.
        </p>
        <Link href="/dashboard" className="mt-6 inline-block text-sm text-primary underline">
          Retour au dashboard
        </Link>
      </div>
    );
  }

  if (metricsQuery.isLoading || revenueQuery.isLoading) {
    return (
      <div className="mx-auto max-w-content px-4 py-8 text-sm text-content-secondary">
        Chargement des analytics…
      </div>
    );
  }

  if (metricsQuery.isError || revenueQuery.isError || !metricsQuery.data) {
    return (
      <div className="mx-auto max-w-content px-4 py-8 text-sm text-error">
        Impossible de charger les métriques.
      </div>
    );
  }

  const metrics = metricsQuery.data;
  const revenueItems = revenueQuery.data?.items ?? [];
  const funnel = funnelQuery.data;
  const cohort = cohortQuery.data ?? [];
  const cac = cacQuery.data;
  const ltv = ltvQuery.data;
  const ltvCac =
    cac?.cac && cac.cac > 0 && ltv?.ltv != null ? (ltv.ltv / cac.cac).toFixed(1) : null;
  const tiers = ['free', 'pro', 'business'] as const;
  const maxTier = Math.max(...tiers.map((t) => metrics.tierBreakdown[t] ?? 0), 1);

  return (
    <div className="mx-auto max-w-content px-4 py-8" data-testid="admin-analytics-page">
      <div className="mb-8">
        <p className="text-sm text-content-muted">Admin</p>
        <h1 className="text-3xl font-semibold">Analytics</h1>
        <p className="mt-2 text-sm text-content-secondary">
          Revenus et abonnements · généré {new Date(metrics.generatedAt).toLocaleString('fr-FR')}
        </p>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Utilisateurs" value={String(metrics.totalUsers)} />
        <MetricCard
          label="MRR"
          value={formatMoney(metrics.mrr)}
          hint={`${metrics.paidUsers} abonnements payants`}
        />
        <MetricCard
          label="Payants actifs"
          value={String(metrics.activePaidUsers)}
          hint={`${metrics.cancelingUsers} en annulation`}
        />
        <MetricCard
          label="Churn programmé"
          value={`${metrics.churnRate.toFixed(2)}%`}
          hint={`${metrics.canceledThisMonth} terminés ce mois`}
        />
        <MetricCard
          label="CAC"
          value={cac?.cac ? formatMoney(cac.cac) : '—'}
          hint={
            cac?.marketingSpend
              ? `${cac.newCustomers} nouveaux payants · spend ${formatMoney(cac.marketingSpend)}`
              : 'Définir ANALYTICS_MARKETING_SPEND_MONTHLY'
          }
        />
        <MetricCard
          label="LTV"
          value={ltv ? formatMoney(ltv.ltv) : '—'}
          hint={
            ltv
              ? `ARPU ${formatMoney(ltv.arpu)} · ${ltv.avgLifetimeMonths.toFixed(1)} mois`
              : undefined
          }
        />
        <MetricCard label="LTV:CAC" value={ltvCac ? `${ltvCac}x` : '—'} hint="Cible saine ≥ 3x" />
        <MetricCard label="Revenus ce mois" value={formatMoney(metrics.revenueThisMonth)} />
      </div>

      <div className="mb-8 grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border border-border bg-surface-card p-6">
          <h2 className="text-xl font-semibold">Utilisateurs par plan</h2>
          <ul className="mt-4 space-y-3">
            {tiers.map((tier) => {
              const count = metrics.tierBreakdown[tier] ?? 0;
              const pct = Math.round((count / maxTier) * 100);
              return (
                <li key={tier}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="capitalize">{tier}</span>
                    <span className="font-medium tabular-nums">{count}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-surface-app">
                    <div
                      className={cn(
                        'h-full rounded-full',
                        tier === 'free' && 'bg-content-muted',
                        tier === 'pro' && 'bg-primary',
                        tier === 'business' && 'bg-secondary'
                      )}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="rounded-lg border border-border bg-surface-card p-6">
          <h2 className="text-xl font-semibold">Revenus ce mois</h2>
          <p className="mt-4 text-3xl font-semibold tabular-nums">
            {formatMoney(metrics.revenueThisMonth)}
          </p>
          <p className="mt-2 text-sm text-content-secondary">
            Somme des factures payées (Stripe / DB) depuis le 1er du mois.
          </p>
        </section>
      </div>

      <section className="rounded-lg border border-border bg-surface-card p-6">
        <h2 className="text-xl font-semibold">Historique des revenus</h2>
        <p className="mt-1 text-sm text-content-secondary">12 derniers mois (factures paid)</p>
        {revenueItems.length === 0 ? (
          <p className="mt-4 text-sm text-content-secondary">
            Aucune donnée de revenu pour l’instant.
          </p>
        ) : (
          <RevenueBars items={revenueItems} />
        )}
      </section>

      <section className="mt-8 rounded-lg border border-border bg-surface-card p-6">
        <h2 className="text-xl font-semibold">Funnel : Signup → Upgrade</h2>
        <p className="mt-1 text-sm text-content-secondary">
          Conversion cumulée depuis les comptes créés (email vérifié, login, CV, plan payant).
        </p>
        {funnel ? (
          <div className="mt-4 space-y-3">
            {(
              [
                ['Signup', funnel.signup],
                ['Email vérifié', funnel.emailVerified],
                ['Dashboard (login)', funnel.dashboard],
                ['CV créé', funnel.cvCreated],
                ['Upgrade', funnel.upgraded],
              ] as const
            ).map(([label, step]) => (
              <div key={label}>
                <div className="mb-1 flex justify-between text-sm">
                  <span>{label}</span>
                  <span className="tabular-nums">
                    {step.count} ({step.rate.toFixed(1)}%)
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-surface-app">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${Math.min(100, step.rate)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-sm text-content-secondary">Funnel indisponible.</p>
        )}
      </section>

      <section className="mt-8 rounded-lg border border-border bg-surface-card p-6">
        <h2 className="text-xl font-semibold">Rétention par cohorte</h2>
        <p className="mt-1 text-sm text-content-secondary">
          Actifs = login 30 derniers jours · Payants = plan Pro/Business non en annulation.
        </p>
        {cohort.length === 0 ? (
          <p className="mt-4 text-sm text-content-secondary">Aucune cohorte pour l’instant.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-content-secondary">
                  <th className="p-2 font-medium">Mois</th>
                  <th className="p-2 font-medium">Taille</th>
                  <th className="p-2 font-medium">Actifs</th>
                  <th className="p-2 font-medium">Rétention</th>
                  <th className="p-2 font-medium">Payants</th>
                </tr>
              </thead>
              <tbody>
                {cohort.map((row) => (
                  <tr key={row.monthKey} className="border-b border-border">
                    <td className="p-2">{row.month}</td>
                    <td className="p-2 tabular-nums">{row.cohortSize}</td>
                    <td className="p-2 tabular-nums">{row.retained}</td>
                    <td
                      className={cn(
                        'p-2 tabular-nums',
                        row.retentionRate > 50 ? 'text-success' : 'text-warning'
                      )}
                    >
                      {row.retentionRate.toFixed(1)}%
                    </td>
                    <td className="p-2 tabular-nums">
                      {row.retainedPaid} ({row.paidRetentionRate.toFixed(1)}%)
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

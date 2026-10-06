'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { ViewsChart } from '@/components/analytics/views-chart';
import { useUserPlan } from '@/hooks';
import { analyticsApi, queryKeys, type ViewSource } from '@/lib/api';
import { SUPPORT_BUSINESS_MAILTO } from '@/lib/billing/plans-catalog';

const PERIODS = [7, 30, 90] as const;

const SOURCE_LABELS: Record<ViewSource, string> = {
  direct: 'Lien direct',
  qr: 'QR code',
  linkedin: 'LinkedIn',
  email: 'E-mail',
  search: 'Moteur de recherche',
  social: 'Réseaux sociaux',
  job_board: 'Site d’emploi',
  other: 'Autre site',
};

function Stat({ label, value, hint }: { label: string; value: number; hint?: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface-card p-4">
      <p className="text-sm text-content-secondary">{label}</p>
      <p className="mt-1 text-3xl font-semibold tabular-nums">{value.toLocaleString('fr-FR')}</p>
      {hint ? <p className="mt-1 text-xs text-content-muted">{hint}</p> : null}
    </div>
  );
}

function BusinessOnly() {
  return (
    <div
      className="mt-8 rounded-lg border border-border bg-surface-card p-6"
      data-testid="analytics-upsell"
    >
      <p className="font-medium">
        Les statistiques détaillées sont incluses dans le plan Business.
      </p>
      <p className="mt-1 text-sm text-content-secondary">
        Vues par jour, visiteurs, provenance (LinkedIn, QR code, e-mail…) pour chacun de vos CV
        publics.
      </p>
      <div className="mt-4 flex gap-2">
        <Link href="/account/billing">
          <Button size="sm">Voir les plans</Button>
        </Link>
        <a href={SUPPORT_BUSINESS_MAILTO}>
          <Button size="sm" variant="outline">
            Contacter le support
          </Button>
        </a>
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  const { isBusiness } = useUserPlan();
  const [days, setDays] = useState<(typeof PERIODS)[number]>(30);
  const { data, isLoading, isError } = useQuery({
    queryKey: queryKeys.cvAnalytics(days),
    queryFn: () => analyticsApi.cvs(days),
    enabled: isBusiness,
  });
  const maxSource = Math.max(1, ...(data?.sources.map((s) => s.views) ?? []));

  return (
    <div className="mx-auto max-w-content px-4 py-8" data-testid="analytics-page">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">Statistiques</h1>
          <p className="mt-1 text-sm text-content-secondary">
            Qui consulte vos CV publics, et d’où viennent les visites.
          </p>
        </div>
        {isBusiness ? (
          <div className="flex gap-1" role="group" aria-label="Période">
            {PERIODS.map((p) => (
              <Button
                key={p}
                size="sm"
                variant={p === days ? 'primary' : 'outline'}
                aria-pressed={p === days}
                onClick={() => setDays(p)}
              >
                {p} jours
              </Button>
            ))}
          </div>
        ) : null}
      </div>

      {!isBusiness ? <BusinessOnly /> : null}
      {isBusiness && isLoading ? <p className="mt-8 text-sm">Chargement…</p> : null}
      {isBusiness && isError ? (
        <p className="mt-8 text-sm text-error">Impossible de charger les statistiques.</p>
      ) : null}

      {data ? (
        <>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <Stat label="Vues" value={data.totals.views} hint={`sur ${data.days} jours`} />
            <Stat
              label="Visiteurs"
              value={data.totals.dailyVisitors}
              hint="une personne comptée une fois par jour"
            />
            <Stat label="CV publics" value={data.totals.publicCvs} />
          </div>

          <section className="mt-6 rounded-lg border border-border bg-surface-card p-4">
            <h2 className="font-semibold">Vues par jour</h2>
            {data.totals.views === 0 ? (
              <p className="mt-2 text-sm text-content-secondary">
                Aucune vue sur cette période. Partagez le lien ou le QR code d’un CV public depuis
                le dashboard.
              </p>
            ) : (
              <div className="mt-2">
                <ViewsChart series={data.series} />
              </div>
            )}
          </section>

          <div className="mt-6 grid gap-6 lg:grid-cols-3">
            <section className="rounded-lg border border-border bg-surface-card p-4">
              <h2 className="font-semibold">Provenance</h2>
              {data.sources.length === 0 ? (
                <p className="mt-2 text-sm text-content-secondary">Pas encore de visite.</p>
              ) : (
                <ul className="mt-3 space-y-3" data-testid="analytics-sources">
                  {data.sources.map((s) => (
                    <li key={s.source}>
                      <div className="flex justify-between text-sm">
                        <span>{SOURCE_LABELS[s.source]}</span>
                        <span className="tabular-nums text-content-secondary">{s.views}</span>
                      </div>
                      <div className="mt-1 h-2 rounded-full bg-[color:var(--cv-color-neutral-100)]">
                        <div
                          className="h-2 rounded-full bg-primary"
                          style={{ width: `${(s.views / maxSource) * 100}%` }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="overflow-x-auto rounded-lg border border-border bg-surface-card p-4 lg:col-span-2">
              <h2 className="font-semibold">Par CV</h2>
              <table className="mt-3 w-full text-sm" data-testid="analytics-cvs">
                <thead>
                  <tr className="text-left text-content-secondary">
                    <th className="py-2 font-medium">CV</th>
                    <th className="py-2 text-right font-medium">Vues</th>
                    <th className="py-2 text-right font-medium">Visiteurs</th>
                    <th className="py-2 text-right font-medium">Dernière vue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data.cvs.map((cv) => (
                    <tr key={cv.id}>
                      <td className="py-2">
                        <span className="font-medium">{cv.title}</span>
                        {!cv.isPublic ? (
                          <span className="ml-2 text-xs text-content-muted">privé</span>
                        ) : null}
                      </td>
                      <td className="py-2 text-right tabular-nums">{cv.views}</td>
                      <td className="py-2 text-right tabular-nums">{cv.dailyVisitors}</td>
                      <td className="py-2 text-right text-content-secondary">
                        {cv.lastViewedAt
                          ? new Date(cv.lastViewedAt).toLocaleDateString('fr-FR')
                          : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          </div>
        </>
      ) : null}
    </div>
  );
}

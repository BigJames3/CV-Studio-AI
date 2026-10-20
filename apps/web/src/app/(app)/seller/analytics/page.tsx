'use client';

import { useEffect, useState } from 'react';
import { marketplaceApi } from '@/lib/api';
import { formatListingPrice } from '@/lib/marketplace/types';

type Analytics = Awaited<ReturnType<typeof marketplaceApi.analytics>>;

export default function SellerAnalyticsPage() {
  const [data, setData] = useState<Analytics | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void marketplaceApi
      .analytics()
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load'));
  }, []);

  // Listings are priced in the payment currency (XOF by default).
  const currency = data?.listings[0]?.currency ?? 'XOF';
  const cards = [
    { label: 'Impressions', value: data ? String(data.impressions) : '—' },
    { label: 'Purchases', value: data ? String(data.purchases) : '—' },
    {
      label: 'Net earnings',
      value: data ? formatListingPrice(data.sellerShareCents, currency) : '—',
    },
  ];

  return (
    <div className="mx-auto max-w-content px-4 py-8">
      <h1 className="text-2xl font-semibold">Analytics</h1>
      <p className="mt-2 text-sm text-content-secondary">
        Impressions, conversion, GMV and earnings (70% seller share).
      </p>
      {error ? (
        <p className="mt-4 text-sm text-error" role="alert">
          {error}
        </p>
      ) : null}
      <div className="mt-6 grid gap-4 sm:grid-cols-3" data-testid="seller-analytics">
        {cards.map((c) => (
          <div key={c.label} className="rounded-xl border p-4">
            <p className="text-xs uppercase tracking-wide text-content-secondary">{c.label}</p>
            <p className="mt-2 text-2xl font-semibold">{c.value}</p>
          </div>
        ))}
      </div>
      {data ? (
        <p className="mt-4 text-sm text-content-secondary">
          Conversion {(data.conversionRate * 100).toFixed(1)}% · GMV{' '}
          {formatListingPrice(data.revenueCents, currency)}
        </p>
      ) : null}
    </div>
  );
}

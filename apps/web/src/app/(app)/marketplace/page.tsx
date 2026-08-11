'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { queryKeys } from '@/lib/api';
import { Button } from '@/components/ui/button';

type Listing = {
  id: string;
  title: string;
  slug: string;
  priceCents: number;
  currency: string;
  rating?: number | null;
  ratingAvg?: number | null;
  previewImageUrl?: string | null;
  template?: { previewImageUrl?: string | null };
};

export default function MarketplacePage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: queryKeys.marketplace,
    queryFn: () => apiClient<Listing[]>('/marketplace/templates', { skipRefresh: true }),
  });

  const items = (data ?? []).map((item) => ({
    ...item,
    previewImageUrl:
      (item as Listing & { template?: { previewImageUrl?: string } }).template?.previewImageUrl ??
      item.previewImageUrl,
    ratingAvg: item.ratingAvg ?? (item as Listing & { rating?: number }).rating,
  }));

  return (
    <div className="mx-auto max-w-content px-4 py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Marketplace</h1>
          <p className="mt-2 max-w-xl text-sm text-[color:var(--cv-text-secondary)]">
            Templates premium par créateurs indépendants. Les vendeurs gardent 70%.
          </p>
        </div>
        <Link href="/seller">
          <Button>Vendre des designs</Button>
        </Link>
      </div>

      {isLoading && <p className="mt-8 text-sm">Chargement…</p>}
      {isError && (
        <p className="mt-8 text-sm text-error">Impossible de charger le marketplace.</p>
      )}

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <Link
            key={item.id}
            href={`/marketplace/${item.id}`}
            className="rounded-lg border border-border bg-surface-card p-4 transition hover:border-primary"
          >
            <div
              className="mb-3 aspect-[3/4] rounded-lg bg-[color:var(--cv-color-neutral-100)] bg-cover bg-center"
              style={
                item.previewImageUrl
                  ? { backgroundImage: `url(${item.previewImageUrl})` }
                  : undefined
              }
            />
            <h2 className="font-semibold">{item.title}</h2>
            <p className="mt-1 text-sm text-[color:var(--cv-text-secondary)]">
              {(item.priceCents / 100).toFixed(2)} {item.currency}
              {item.ratingAvg != null ? ` · ★ ${Number(item.ratingAvg).toFixed(1)}` : ''}
            </p>
          </Link>
        ))}
        {!isLoading && items.length === 0 && (
          <p className="col-span-full text-sm text-[color:var(--cv-text-secondary)]">
            Aucune listing publiée pour le moment. Devenez vendeur pour en créer.
          </p>
        )}
      </div>
    </div>
  );
}

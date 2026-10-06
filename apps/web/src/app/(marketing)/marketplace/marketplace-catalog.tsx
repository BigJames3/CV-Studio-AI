'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { marketplaceApi, queryKeys } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { ProductCard } from '@/components/marketplace/product-card';
import {
  CATEGORY_LABELS,
  SORT_LABELS,
  TEMPLATE_CATEGORIES,
  type MarketplaceSort,
} from '@/lib/marketplace/types';

export function MarketplaceCatalog() {
  const [q, setQ] = useState('');
  const [category, setCategory] = useState('');
  const [sort, setSort] = useState<MarketplaceSort>('popular');

  const filters = useMemo(
    () => ({
      q: q.trim() || undefined,
      category: category || undefined,
      sort,
    }),
    [q, category, sort]
  );

  const { data, isLoading, isError } = useQuery({
    queryKey: queryKeys.marketplaceCatalog(filters),
    queryFn: () => marketplaceApi.listTemplates(filters),
  });

  const items = data ?? [];

  return (
    <div className="mx-auto max-w-content px-4 py-8" data-testid="marketplace-page">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Marketplace</h1>
          <p className="mt-2 max-w-xl text-sm text-content-secondary">
            Templates premium par créateurs indépendants. Les vendeurs gardent 70 %.
          </p>
        </div>
        <Link href="/seller">
          <Button>Vendre des designs</Button>
        </Link>
      </div>

      <form
        className="mt-6 grid gap-3 sm:grid-cols-3"
        onSubmit={(e) => e.preventDefault()}
        role="search"
      >
        <label className="block text-sm">
          Rechercher
          <input
            className="mt-1 w-full rounded-lg border border-border bg-surface-card px-3 py-2"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Nom, description…"
            data-testid="marketplace-search"
          />
        </label>
        <label className="block text-sm">
          Catégorie
          <select
            className="mt-1 w-full rounded-lg border border-border bg-surface-card px-3 py-2"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            data-testid="marketplace-category"
          >
            <option value="">Toutes</option>
            {TEMPLATE_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABELS[c]}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          Trier
          <select
            className="mt-1 w-full rounded-lg border border-border bg-surface-card px-3 py-2"
            value={sort}
            onChange={(e) => setSort(e.target.value as MarketplaceSort)}
            data-testid="marketplace-sort"
          >
            {(Object.keys(SORT_LABELS) as MarketplaceSort[]).map((key) => (
              <option key={key} value={key}>
                {SORT_LABELS[key]}
              </option>
            ))}
          </select>
        </label>
      </form>

      {isLoading && <p className="mt-8 text-sm">Chargement…</p>}
      {isError && <p className="mt-8 text-sm text-error">Impossible de charger le marketplace.</p>}

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <ProductCard key={item.id} listing={item} />
        ))}
        {!isLoading && items.length === 0 && (
          <p className="col-span-full text-sm text-content-secondary">
            Aucune listing publiée pour le moment. Devenez vendeur pour en créer.
          </p>
        )}
      </div>
    </div>
  );
}

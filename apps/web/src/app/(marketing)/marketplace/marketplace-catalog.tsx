'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { marketplaceApi, queryKeys } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { CatalogCard } from '@/components/marketplace/catalog-card';
import {
  CATEGORY_LABELS,
  SORT_LABELS,
  SOURCE_LABELS,
  TEMPLATE_CATEGORIES,
  type CatalogFilters,
  type CatalogSource,
  type MarketplaceSort,
} from '@/lib/marketplace/types';

const PAGE_SIZE = 24;
const SOURCES: CatalogSource[] = ['all', 'official', 'seller'];

const EMPTY_MESSAGES: Record<CatalogSource, string> = {
  all: 'Aucun modèle ne correspond à ces critères.',
  official: 'Aucun modèle officiel ne correspond à ces critères.',
  seller: 'Aucun modèle vendeur publié pour le moment.',
};

export function MarketplaceCatalog() {
  const [source, setSource] = useState<CatalogSource>('all');
  const [q, setQ] = useState('');
  const [category, setCategory] = useState('');
  const [sort, setSort] = useState<MarketplaceSort>('popular');
  const [page, setPage] = useState(1);

  const filters = useMemo<CatalogFilters>(
    () => ({ source, q: q.trim() || undefined, category: category || undefined, sort, page }),
    [source, q, category, sort, page]
  );
  // Any filter change starts again from the first page.
  const update =
    <T,>(set: (value: T) => void) =>
    (value: T) => {
      set(value);
      setPage(1);
    };

  const { data, isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: queryKeys.marketplaceCatalog(filters),
    queryFn: () => marketplaceApi.catalog(filters, PAGE_SIZE),
    placeholderData: keepPreviousData,
  });

  const items = data?.items ?? [];
  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <div className="mx-auto max-w-content px-4 py-8" data-testid="marketplace-page">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Marketplace</h1>
          <p className="mt-2 max-w-xl text-sm text-content-secondary">
            Les modèles officiels inclus dans votre formule et les designs de créateurs
            indépendants, vendus à l’unité.
          </p>
        </div>
        <Link href="/seller">
          <Button>Vendre des designs</Button>
        </Link>
      </div>

      <div
        className="mt-6 inline-flex rounded-lg border border-border p-1"
        role="group"
        aria-label="Origine des modèles"
      >
        {SOURCES.map((s) => {
          const count =
            s === 'all'
              ? data?.total
              : s === 'official'
                ? data?.totals.official
                : data?.totals.seller;
          return (
            <button
              key={s}
              type="button"
              aria-pressed={source === s}
              onClick={() => update(setSource)(s)}
              className={
                source === s
                  ? 'rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-white'
                  : 'rounded-md px-3 py-1.5 text-sm text-content-secondary hover:text-content-primary'
              }
              data-testid={`marketplace-source-${s}`}
            >
              {SOURCE_LABELS[s]}
              {source === 'all' && count != null ? ` (${count})` : ''}
            </button>
          );
        })}
      </div>

      <form
        className="mt-4 grid gap-3 sm:grid-cols-3"
        onSubmit={(e) => e.preventDefault()}
        role="search"
      >
        <label className="block text-sm">
          Rechercher
          <input
            className="mt-1 w-full rounded-lg border border-border bg-surface-card px-3 py-2"
            value={q}
            onChange={(e) => update(setQ)(e.target.value)}
            placeholder="Nom, description…"
            maxLength={100}
            data-testid="marketplace-search"
          />
        </label>
        <label className="block text-sm">
          Catégorie
          <select
            className="mt-1 w-full rounded-lg border border-border bg-surface-card px-3 py-2"
            value={category}
            onChange={(e) => update(setCategory)(e.target.value)}
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
            onChange={(e) => update(setSort)(e.target.value as MarketplaceSort)}
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
      {sort.startsWith('price') && source !== 'seller' ? (
        <p className="mt-2 text-xs text-content-secondary">
          Les modèles officiels n’ont pas de prix : ils sont inclus dans les formules.
        </p>
      ) : null}

      {isLoading ? (
        <p className="mt-8 text-sm" role="status">
          Chargement…
        </p>
      ) : null}
      {isError ? (
        <div className="mt-8 text-sm text-error" role="alert">
          Impossible de charger le marketplace.{' '}
          <button type="button" className="underline" onClick={() => void refetch()}>
            Réessayer
          </button>
        </div>
      ) : null}

      <div
        className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        aria-busy={isFetching}
        data-testid="marketplace-grid"
      >
        {items.map((item) => (
          <CatalogCard key={`${item.kind}:${item.id}`} item={item} />
        ))}
        {!isLoading && !isError && items.length === 0 ? (
          <p
            className="col-span-full text-sm text-content-secondary"
            data-testid="marketplace-empty"
          >
            {EMPTY_MESSAGES[source]}
            {source === 'seller' ? ' Devenez vendeur pour proposer les vôtres.' : ''}
          </p>
        ) : null}
      </div>

      {pages > 1 ? (
        <nav
          className="mt-8 flex items-center justify-center gap-3 text-sm"
          aria-label="Pagination du marketplace"
        >
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page <= 1 || isFetching}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            data-testid="marketplace-prev"
          >
            Précédent
          </Button>
          <span aria-live="polite">
            Page {page} sur {pages}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page >= pages || isFetching}
            onClick={() => setPage((p) => Math.min(pages, p + 1))}
            data-testid="marketplace-next"
          >
            Suivant
          </Button>
        </nav>
      ) : null}
    </div>
  );
}

import Link from 'next/link';
import { TemplateThumbnail } from '@/components/templates/TemplateThumbnail';
import { categoryToKey } from '@/lib/templates/catalog';
import { CATEGORY_LABELS, formatListingPrice, type CatalogItem } from '@/lib/marketplace/types';

function Rating({ value, count }: { value: number | null; count?: number }) {
  if (value == null || value <= 0) return null;
  return (
    <span>
      {' '}
      · {value.toFixed(1)}/5{count ? ` (${count})` : ''}
    </span>
  );
}

/** One card of the shop: official templates come with a plan, seller ones are bought. */
export function CatalogCard({ item }: { item: CatalogItem }) {
  const category = CATEGORY_LABELS[item.category] ?? item.category;

  return (
    <Link
      href={item.href}
      className="flex flex-col rounded-lg border border-border bg-surface-card p-4 transition hover:border-primary focus-visible:border-primary"
      data-testid="marketplace-product-card"
      data-kind={item.kind}
    >
      {item.kind === 'official' ? (
        <div
          className="mb-3 aspect-[210/297] overflow-hidden rounded-lg border border-border bg-white"
          aria-hidden
        >
          <TemplateThumbnail templateKey={categoryToKey(item.layoutKey ?? item.category)} />
        </div>
      ) : (
        <div
          className="mb-3 aspect-[3/4] rounded-lg bg-[color:var(--cv-color-neutral-100)] bg-cover bg-center"
          style={
            item.previewImageUrl ? { backgroundImage: `url(${item.previewImageUrl})` } : undefined
          }
          role="img"
          aria-label={
            item.previewImageUrl ? `Aperçu ${item.title}` : `Pas d’aperçu pour ${item.title}`
          }
        />
      )}

      <div className="flex items-center justify-between gap-2">
        <p className="text-xs uppercase tracking-wide text-content-secondary">{category}</p>
        <span className="rounded-full bg-[color:var(--cv-color-neutral-100)] px-2 py-0.5 text-xs">
          {item.kind === 'official' ? 'Officiel' : 'Vendeur'}
        </span>
      </div>
      <h2 className="mt-1 font-semibold">{item.title}</h2>
      {item.kind === 'seller' && item.seller ? (
        <p className="mt-0.5 text-sm text-content-secondary">{item.seller.displayName}</p>
      ) : null}
      <p className="mt-1 text-sm text-content-secondary">
        {item.kind === 'official'
          ? item.access === 'pro'
            ? 'Inclus avec Pro et Business'
            : 'Inclus avec toutes les formules'
          : formatListingPrice(item.priceCents, item.currency)}
        <Rating value={item.rating} count={item.kind === 'seller' ? item.reviewCount : undefined} />
      </p>
    </Link>
  );
}

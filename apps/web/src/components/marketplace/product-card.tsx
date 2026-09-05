import Link from 'next/link';
import {
  CATEGORY_LABELS,
  formatListingPrice,
  listingPreviewUrl,
  listingRating,
  type MarketplaceListing,
} from '@/lib/marketplace/types';

export function ProductCard({ listing }: { listing: MarketplaceListing }) {
  const preview = listingPreviewUrl(listing);
  const rating = listingRating(listing);
  const category = listing.template?.category;

  return (
    <Link
      href={`/marketplace/${listing.id}`}
      className="rounded-lg border border-border bg-surface-card p-4 transition hover:border-primary"
      data-testid="marketplace-product-card"
    >
      <div
        className="mb-3 aspect-[3/4] rounded-lg bg-[color:var(--cv-color-neutral-100)] bg-cover bg-center"
        style={preview ? { backgroundImage: `url(${preview})` } : undefined}
        role="img"
        aria-label={preview ? `Aperçu ${listing.title}` : `Pas d’aperçu pour ${listing.title}`}
      />
      {category ? (
        <p className="text-xs uppercase tracking-wide text-content-secondary">
          {CATEGORY_LABELS[category] ?? category}
        </p>
      ) : null}
      <h2 className="mt-1 font-semibold">{listing.title}</h2>
      {listing.sellerProfile?.displayName ? (
        <p className="mt-0.5 text-sm text-content-secondary">{listing.sellerProfile.displayName}</p>
      ) : null}
      <p className="mt-1 text-sm text-content-secondary">
        {formatListingPrice(listing.priceCents, listing.currency)}
        {rating != null ? ` · ${rating.toFixed(1)}/5` : ''}
      </p>
    </Link>
  );
}

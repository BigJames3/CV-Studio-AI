'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { marketplaceApi, queryKeys } from '@/lib/api';
import { BuyLicenceButton } from '@/components/marketplace/buy-licence-button';
import {
  CATEGORY_LABELS,
  formatListingPrice,
  listingPreviewUrl,
  listingRating,
} from '@/lib/marketplace/types';

export function ListingDetail({ listingId }: { listingId: string }) {
  const searchParams = useSearchParams();
  const checkout = searchParams.get('checkout');
  const {
    data: listing,
    isLoading,
    isError,
  } = useQuery({
    queryKey: queryKeys.marketplaceListing(listingId),
    queryFn: () => marketplaceApi.getListing(listingId),
  });

  if (isLoading) {
    return <p className="mt-8 text-sm">Chargement du template…</p>;
  }

  if (isError || !listing) {
    return (
      <p className="mt-8 text-sm text-error" role="alert">
        Listing introuvable ou non publié.{' '}
        <Link href="/marketplace" className="text-primary">
          Retour au marketplace
        </Link>
      </p>
    );
  }

  const preview = listingPreviewUrl(listing);
  const rating = listingRating(listing);
  const category = listing.template?.category;
  const description =
    listing.description || listing.template?.description || 'Design premium pour CV ATS-ready.';

  return (
    <div className="mx-auto grid max-w-content gap-8 px-4 py-8 lg:grid-cols-2">
      <div
        className="aspect-[3/4] rounded-xl bg-surface-app bg-cover bg-center"
        style={preview ? { backgroundImage: `url(${preview})` } : undefined}
        role="img"
        aria-label={preview ? `Aperçu ${listing.title}` : `Pas d’aperçu pour ${listing.title}`}
      />
      <div>
        {checkout === 'success' ? (
          <p
            className="mb-4 rounded-lg border border-primary/30 bg-primary-subtle px-3 py-2 text-sm"
            data-testid="marketplace-checkout-success"
          >
            Paiement reçu. La licence s’active dès confirmation Stripe (quelques secondes).
          </p>
        ) : null}
        {checkout === 'cancel' ? (
          <p className="mb-4 rounded-lg border border-border px-3 py-2 text-sm" role="status">
            Paiement annulé. Aucun débit n’a été effectué.
          </p>
        ) : null}

        <p className="text-sm text-content-secondary">
          {category ? (CATEGORY_LABELS[category] ?? category) : 'Template'}
          {listing.sellerProfile?.displayName ? ` · ${listing.sellerProfile.displayName}` : ''}
        </p>
        <h1 className="mt-1 text-3xl font-semibold">{listing.title}</h1>
        <p className="mt-4 text-content-secondary">{description}</p>
        <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-content-secondary">
          <li>Licence d’usage personnelle dans CV Studio — non redistribuable.</li>
          <li>Import dans l’éditeur après achat. Pas d’installation externe.</li>
          <li>Le créateur reçoit 70 % du net après frais de paiement.</li>
        </ul>
        <p className="mt-6 text-2xl font-semibold">
          {formatListingPrice(listing.priceCents, listing.currency)}
          {rating != null
            ? ` · ${rating.toFixed(1)}/5 (${listing.reviewCount ?? listing.reviews?.length ?? 0})`
            : ''}
        </p>
        <BuyLicenceButton listingId={listing.id} />
        {listing.reviews && listing.reviews.length > 0 ? (
          <section className="mt-8" aria-labelledby="reviews-heading">
            <h2 id="reviews-heading" className="text-lg font-semibold">
              Avis
            </h2>
            <ul className="mt-3 space-y-3">
              {listing.reviews.map((review) => (
                <li key={review.id} className="rounded-lg border border-border p-3 text-sm">
                  <p className="font-medium">{review.rating}/5</p>
                  {review.comment ? (
                    <p className="mt-1 text-content-secondary">{review.comment}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        ) : (
          <p className="mt-6 text-sm text-content-secondary">Pas encore d’avis.</p>
        )}
        <p className="mt-6 text-sm">
          <Link href="/marketplace" className="text-primary">
            ← Retour au marketplace
          </Link>
        </p>
      </div>
    </div>
  );
}

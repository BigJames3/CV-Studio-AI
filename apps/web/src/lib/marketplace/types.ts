export const TEMPLATE_CATEGORIES = [
  'modern',
  'creative',
  'executive',
  'startup',
  'ats_optimized',
] as const;

export type TemplateCategory = (typeof TEMPLATE_CATEGORIES)[number];

export type MarketplaceSort = 'popular' | 'newest' | 'price_low' | 'price_high' | 'rating';

export type MarketplaceListing = {
  id: string;
  title: string;
  slug: string;
  description?: string | null;
  priceCents: number;
  currency: string;
  rating?: number | string | null;
  reviewCount?: number;
  tags?: string[];
  previewImageUrl?: string | null;
  template?: {
    name?: string;
    description?: string | null;
    previewImageUrl?: string | null;
    category?: TemplateCategory | string;
  };
  sellerProfile?: { displayName: string; slug: string; tier?: string } | null;
  reviews?: Array<{
    id: string;
    rating: number;
    comment?: string | null;
    createdAt: string;
  }>;
};

export function listingPreviewUrl(listing: MarketplaceListing): string | null {
  return listing.template?.previewImageUrl ?? listing.previewImageUrl ?? null;
}

export function listingRating(listing: MarketplaceListing): number | null {
  if (listing.rating == null) return null;
  const n = Number(listing.rating);
  return Number.isFinite(n) ? n : null;
}

export function formatListingPrice(priceCents: number, currency: string): string {
  try {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(priceCents / 100);
  } catch {
    return `${(priceCents / 100).toFixed(2)} ${currency}`;
  }
}

export const CATEGORY_LABELS: Record<string, string> = {
  modern: 'Moderne',
  creative: 'Créatif',
  executive: 'Exécutif',
  startup: 'Startup',
  ats_optimized: 'ATS',
};

export const SORT_LABELS: Record<MarketplaceSort, string> = {
  popular: 'Populaires',
  newest: 'Plus récents',
  rating: 'Mieux notés',
  price_low: 'Prix croissant',
  price_high: 'Prix décroissant',
};

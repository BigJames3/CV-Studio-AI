import { Suspense } from 'react';
import { createPageMetadata } from '@/lib/seo';
import { ListingDetail } from '@/components/marketplace/listing-detail';

// Next 15: route params are a Promise.
type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  return createPageMetadata({
    title: 'Template marketplace',
    description: 'Détail d’un template premium CV Studio',
    path: `/marketplace/${id}`,
  });
}

export default async function MarketplaceDetailPage({ params }: Props) {
  const { id } = await params;
  return (
    <Suspense fallback={<p className="mx-auto max-w-content px-4 py-8 text-sm">Chargement…</p>}>
      <ListingDetail listingId={id} />
    </Suspense>
  );
}

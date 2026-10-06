import { Suspense } from 'react';
import { createPageMetadata } from '@/lib/seo';
import { ListingDetail } from '@/components/marketplace/listing-detail';

type Props = { params: { id: string } };

export function generateMetadata({ params }: Props) {
  return createPageMetadata({
    title: 'Template marketplace',
    description: 'Détail d’un template premium CV Studio',
    path: `/marketplace/${params.id}`,
  });
}

export default function MarketplaceDetailPage({ params }: Props) {
  return (
    <Suspense fallback={<p className="mx-auto max-w-content px-4 py-8 text-sm">Chargement…</p>}>
      <ListingDetail listingId={params.id} />
    </Suspense>
  );
}

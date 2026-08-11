import Link from 'next/link';
import { createPageMetadata } from '@/lib/seo';

type Props = { params: { id: string } };

export function generateMetadata({ params }: Props) {
  return createPageMetadata({
    title: `Template ${params.id}`,
    description: 'Marketplace listing detail',
    path: `/marketplace/${params.id}`,
  });
}

export default function MarketplaceDetailPage({ params }: Props) {
  return (
    <div className="mx-auto grid max-w-content gap-8 px-4 py-8 lg:grid-cols-2">
      <div className="aspect-[3/4] rounded-xl bg-[color:var(--cv-bg-muted)]" />
      <div>
        <p className="text-sm text-[color:var(--cv-text-secondary)]">Listing {params.id}</p>
        <h1 className="mt-1 text-3xl font-semibold">Premium template</h1>
        <p className="mt-4 text-[color:var(--cv-text-secondary)]">
          Quality-approved design. One-time licence for use in CV Studio. Platform fee 30% — creator
          earns 70% of net.
        </p>
        <p className="mt-6 text-2xl font-semibold">$12.99</p>
        <button
          type="button"
          className="mt-4 w-full rounded-lg bg-[color:var(--cv-primary)] px-4 py-3 text-sm font-semibold text-white sm:w-auto"
        >
          Purchase licence
        </button>
        <p className="mt-6 text-sm">
          <Link href="/marketplace" className="text-[color:var(--cv-primary)]">
            ← Back to marketplace
          </Link>
        </p>
      </div>
    </div>
  );
}

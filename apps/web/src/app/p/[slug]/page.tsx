import { createPageMetadata } from '@/lib/seo';

export const metadata = createPageMetadata({
  title: 'Portfolio',
  description: 'Portfolio public',
  noIndex: true,
});

export default function PublicPortfolioPage({ params }: { params: { slug: string } }) {
  return (
    <main id="main" className="mx-auto max-w-content px-4 py-16">
      <h1 className="text-3xl font-semibold">Portfolio</h1>
      <p className="mt-2 text-sm text-[color:var(--cv-text-secondary)]">Slug: {params.slug}</p>
    </main>
  );
}

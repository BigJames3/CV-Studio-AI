import { createPageMetadata } from '@/lib/seo';

export const metadata = createPageMetadata({
  title: 'Portfolio',
  description: 'Portfolio public',
  noIndex: true,
});

export default async function PublicPortfolioPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return (
    <main id="main" className="mx-auto max-w-content px-4 py-16">
      <h1 className="text-3xl font-semibold">Portfolio</h1>
      <p className="mt-2 text-sm text-content-secondary">Slug: {slug}</p>
    </main>
  );
}

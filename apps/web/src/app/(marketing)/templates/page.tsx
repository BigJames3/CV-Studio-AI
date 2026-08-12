import Link from 'next/link';
import { createPageMetadata } from '@/lib/seo';
import { TEMPLATE_CATALOG } from '@/lib/templates/catalog';

export const metadata = createPageMetadata({
  title: 'CV Templates',
  description: 'Modern, Creative, Executive, Startup, and ATS-optimized resume templates.',
  path: '/templates',
});

export default function MarketingTemplatesPage() {
  return (
    <div className="mx-auto max-w-content px-4 py-16">
      <h1 className="text-4xl font-semibold tracking-tight">Professional CV templates</h1>
      <p className="mt-3 max-w-2xl text-content-secondary">
        Five highly customizable designs — pick one, tune colors and fonts, export ATS-ready PDFs.
      </p>
      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {TEMPLATE_CATALOG.map((t) => (
          <div key={t.id} className="rounded-xl border border-border p-4">
            <p className="text-xs uppercase tracking-wide text-content-secondary">{t.category}</p>
            <h2 className="mt-1 text-xl font-semibold">{t.name}</h2>
            <p className="mt-2 text-sm text-content-secondary">{t.description}</p>
            <p className="mt-3 text-xs">{t.designData?.usage}</p>
          </div>
        ))}
      </div>
      <Link
        href="/dashboard/templates"
        className="mt-10 inline-flex rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-white"
      >
        Open template studio
      </Link>
    </div>
  );
}

import Link from 'next/link';
import { createPageMetadata } from '@/lib/seo';
import { TEMPLATE_CATALOG, templateKeyOf } from '@/lib/templates/catalog';
import { TemplateThumbnail } from '@/components/templates/TemplateThumbnail';

export const metadata = createPageMetadata({
  title: 'Modèles de CV',
  description:
    '15 modèles de CV professionnels : classique, moderne, compact, ATS, élégant, timeline et plus.',
  path: '/templates',
});

export default function MarketingTemplatesPage() {
  return (
    <div className="mx-auto max-w-content px-4 py-16">
      <h1 className="text-4xl font-semibold tracking-tight">Modèles de CV professionnels</h1>
      <p className="mt-3 max-w-2xl text-content-secondary">
        {TEMPLATE_CATALOG.length} modèles personnalisables pour tous les métiers : choisissez-en un,
        ajustez les couleurs et les polices, exportez un PDF prêt pour les ATS.
      </p>
      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {TEMPLATE_CATALOG.map((t) => (
          <div
            key={t.id}
            className="rounded-xl border border-border p-4"
            data-testid={`template-${t.id}`}
          >
            <div className="mb-4 aspect-[210/297] overflow-hidden rounded-lg border border-border bg-white">
              <TemplateThumbnail templateKey={templateKeyOf(t)} />
            </div>
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-xl font-semibold">{t.name}</h2>
              <span className="rounded-full bg-[color:var(--cv-color-neutral-100)] px-2 py-0.5 text-xs">
                {t.isPremium ? 'Pro' : 'Gratuit'}
              </span>
            </div>
            <p className="mt-2 text-sm text-content-secondary">{t.description}</p>
          </div>
        ))}
      </div>
      <Link
        href="/dashboard/templates"
        className="mt-10 inline-flex rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-white"
      >
        Créer mon CV
      </Link>
    </div>
  );
}

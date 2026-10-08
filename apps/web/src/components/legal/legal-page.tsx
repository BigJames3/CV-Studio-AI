import Link from 'next/link';
import { LEGAL_LAST_UPDATED, MISSING_LEGAL_INFO } from '@/lib/legal';

export const LEGAL_LINKS = [
  { href: '/privacy', label: 'Confidentialité' },
  { href: '/terms', label: 'Conditions d’utilisation' },
  { href: '/subscription-terms', label: 'Conditions d’abonnement' },
  { href: '/refund-policy', label: 'Remboursements' },
  { href: '/cookie-policy', label: 'Cookies' },
  { href: '/legal-notice', label: 'Mentions légales' },
] as const;

export function LegalPage({
  title,
  testId,
  intro,
  children,
}: {
  title: string;
  testId: string;
  intro?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <article className="mx-auto max-w-content px-4 py-16" data-testid={testId}>
      <h1 className="text-3xl font-semibold sm:text-4xl">{title}</h1>
      <p className="mt-2 text-sm text-content-secondary">
        Dernière mise à jour : {LEGAL_LAST_UPDATED}
      </p>

      {MISSING_LEGAL_INFO.length > 0 && (
        <aside
          role="note"
          className="mt-6 rounded-md border-2 border-warning bg-surface-card p-4 text-sm text-content-primary"
          data-testid="legal-draft-notice"
        >
          <p className="font-semibold">Document en cours de validation</p>
          <p className="mt-1">
            Les informations suivantes doivent encore être complétées et le texte validé
            juridiquement : {MISSING_LEGAL_INFO.join(', ')}.
          </p>
        </aside>
      )}

      {intro && <div className="mt-6 text-sm leading-relaxed text-content-secondary">{intro}</div>}

      <div className="legal-body mt-10 space-y-8 text-sm leading-relaxed text-content-secondary">
        {children}
      </div>

      <nav aria-label="Documents juridiques" className="mt-12 border-t border-border pt-6">
        <ul className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
          {LEGAL_LINKS.map((link) => (
            <li key={link.href}>
              <Link href={link.href} className="text-primary underline">
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </article>
  );
}

export function LegalSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-xl font-semibold text-content-primary">{title}</h2>
      <div className="mt-2 space-y-2">{children}</div>
    </section>
  );
}

export function LegalList({ children }: { children: React.ReactNode }) {
  return <ul className="list-disc space-y-1 pl-5">{children}</ul>;
}

export function MailLink({ address }: { address: string }) {
  return (
    <a className="text-primary underline" href={`mailto:${address}`}>
      {address}
    </a>
  );
}

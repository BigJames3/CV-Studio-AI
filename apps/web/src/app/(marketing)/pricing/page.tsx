import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { createPageMetadata } from '@/lib/seo';
import { PricingAnalytics } from '@/components/analytics/pricing-analytics';

export const metadata = createPageMetadata({
  title: 'Pricing',
  description: 'Free, Pro 9,99$/mois, Business 29,99$/mois — pricing transparent.',
  path: '/pricing',
});

const plans = [
  {
    name: 'Free',
    price: '0€',
    features: ['1 CV', '5 templates', 'Export PDF', 'Pas d’IA'],
    cta: '/register',
  },
  {
    name: 'Pro',
    price: '9,99$/mois',
    features: ['CV illimités', '50+ templates', 'Toute l’IA', 'ATS complet', 'Portfolio'],
    cta: '/register',
    highlight: true,
  },
  {
    name: 'Business',
    price: '29,99$/mois',
    features: ['Tout Pro', 'Collab équipe', 'Analytics', 'API', 'Branding'],
    cta: '/register',
  },
];

export default function PricingPage() {
  return (
    <div className="mx-auto max-w-content px-4 py-16" data-testid="pricing-page">
      <PricingAnalytics />
      <h1 className="text-4xl font-semibold">Tarifs simples</h1>
      <p className="mt-2 text-content-secondary">
        Sans watermark sur le PDF Free. Annulation self-serve.
      </p>
      <div className="mt-12 grid gap-6 md:grid-cols-3">
        {plans.map((p) => (
          <div
            key={p.name}
            data-testid={`pricing-plan-${p.name.toLowerCase()}`}
            className={`rounded-lg border border-border bg-surface-card p-6 shadow-1 ${
              p.highlight ? 'ring-2 ring-primary' : ''
            }`}
          >
            <h2 className="text-xl font-semibold">{p.name}</h2>
            <p className="mt-2 text-3xl font-semibold">{p.price}</p>
            <ul className="mt-6 space-y-2 text-sm text-content-secondary">
              {p.features.map((f) => (
                <li key={f}>• {f}</li>
              ))}
            </ul>
            <Link href={p.cta} className="mt-8 block">
              <Button
                className="w-full"
                variant={p.highlight ? 'primary' : 'secondary'}
                data-testid={`pricing-cta-${p.name.toLowerCase()}`}
              >
                Commencer
              </Button>
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}

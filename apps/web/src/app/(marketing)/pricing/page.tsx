import Link from 'next/link';
import { createPageMetadata } from '@/lib/seo';
import { PricingAnalytics } from '@/components/analytics/pricing-analytics';
import { PricingPlanCards } from '@/components/billing/pricing-plan-cards';

export const metadata = createPageMetadata({
  title: 'Pricing',
  description: 'Gratuit, Pro 9,99 €/mois, Business 29,99 €/mois — pricing transparent.',
  path: '/pricing',
});

export default function PricingPage() {
  return (
    <div className="mx-auto max-w-content px-4 py-16" data-testid="pricing-page">
      <PricingAnalytics />
      <h1 className="text-4xl font-semibold">Tarifs simples</h1>
      <p className="mt-2 text-content-secondary">
        Export PDF et partage à partir du plan Pro. Annulation self-serve.
      </p>
      <PricingPlanCards />
      <p className="mt-8 text-sm text-content-secondary">
        Prix en euros. Essai gratuit de 14 jours une fois par compte, carte demandée, premier
        paiement à la fin de l’essai sauf résiliation. Abonnement renouvelé automatiquement jusqu’à
        résiliation. Voir les{' '}
        <Link href="/subscription-terms" className="text-primary underline">
          conditions d’abonnement
        </Link>{' '}
        et la{' '}
        <Link href="/refund-policy" className="text-primary underline">
          politique de remboursement
        </Link>
        .
      </p>
    </div>
  );
}

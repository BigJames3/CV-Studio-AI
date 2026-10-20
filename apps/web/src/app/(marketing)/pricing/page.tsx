import Link from 'next/link';
import { createPageMetadata } from '@/lib/seo';
import { PricingAnalytics } from '@/components/analytics/pricing-analytics';
import { PricingPlanCards } from '@/components/billing/pricing-plan-cards';

export const metadata = createPageMetadata({
  title: 'Pricing',
  description:
    'Gratuit, Pro 6 600 F CFA/mois, Business 19 700 F CFA/mois — pricing transparent, paiement Mobile Money ou carte.',
  path: '/pricing',
});

export default function PricingPage() {
  return (
    <div className="mx-auto max-w-content px-4 py-16" data-testid="pricing-page">
      <PricingAnalytics />
      <h1 className="text-4xl font-semibold">Tarifs simples</h1>
      <p className="mt-2 text-content-secondary">
        Export PDF et partage à partir du plan Pro. Sans engagement ni prélèvement automatique.
      </p>
      <PricingPlanCards />
      <p className="mt-8 text-sm text-content-secondary">
        Prix en francs CFA (XOF). Paiement unique par Orange Money, MTN Mobile Money, Wave ou carte
        bancaire, pour un mois ou un an : rien n’est renouvelé automatiquement, vous prolongez quand
        vous le souhaitez. Voir les{' '}
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

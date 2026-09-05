import { createPageMetadata } from '@/lib/seo';
import { PricingAnalytics } from '@/components/analytics/pricing-analytics';
import { PricingPlans } from './pricing-plans';

export const metadata = createPageMetadata({
  title: 'Tarifs',
  description: 'Gratuit, Pro 9,99 $/mois, Business 29,99 $/mois — tarifs transparents.',
  path: '/pricing',
});

export default function PricingPage() {
  return (
    <div className="mx-auto max-w-content px-4 py-16" data-testid="pricing-page">
      <PricingAnalytics />
      <h1 className="text-4xl font-semibold">Tarifs simples</h1>
      <p className="mt-2 text-content-secondary">
        Sans watermark sur le PDF Free. Annulation self-serve.
      </p>
      <PricingPlans />
    </div>
  );
}

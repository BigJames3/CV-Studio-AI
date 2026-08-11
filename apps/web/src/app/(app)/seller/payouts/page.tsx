import { createPageMetadata } from '@/lib/seo';

export const metadata = createPageMetadata({
  title: 'Payouts',
  description: 'Review marketplace payouts and earnings for your seller account.',
  path: '/seller/payouts',
  noIndex: true,
});

export default function SellerPayoutsPage() {
  return (
    <div className="mx-auto max-w-content px-4 py-8">
      <h1 className="text-2xl font-semibold">Payouts</h1>
      <p className="mt-2 text-sm text-[color:var(--cv-text-secondary)]">
        Weekly Stripe Connect transfers · minimum $25 · new sellers: 14-day 10% reserve.
      </p>
    </div>
  );
}

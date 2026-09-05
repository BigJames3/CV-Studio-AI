import { createPageMetadata } from '@/lib/seo';
import { SellerPayoutsPanel } from '@/components/marketplace/seller-payouts-panel';

export const metadata = createPageMetadata({
  title: 'Payouts',
  description: 'Review marketplace payouts and complete Stripe Connect verification.',
  path: '/seller/payouts',
  noIndex: true,
});

export default function SellerPayoutsPage() {
  return <SellerPayoutsPanel />;
}

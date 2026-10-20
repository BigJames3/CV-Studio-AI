import { createPageMetadata } from '@/lib/seo';
import { SellerPayoutsPanel } from '@/components/marketplace/seller-payouts-panel';

export const metadata = createPageMetadata({
  title: 'Versements',
  description: 'Compte de versement Paystack et historique des versements de la marketplace.',
  path: '/seller/payouts',
  noIndex: true,
});

export default function SellerPayoutsPage() {
  return <SellerPayoutsPanel />;
}

import { createPageMetadata } from '@/lib/seo';
import { MarketplaceCatalog } from './marketplace-catalog';

export const metadata = createPageMetadata({
  title: 'Marketplace',
  description: 'Templates premium par créateurs indépendants. Parcourez et achetez des designs CV.',
  path: '/marketplace',
});

export default function MarketplacePage() {
  return <MarketplaceCatalog />;
}

import { LandingPageContent } from '@/components/marketing/landing-page-content';
import { createPageMetadata } from '@/lib/seo';

export const metadata = createPageMetadata({
  title: 'CV Studio AI',
  description:
    'Des CV qui passent les filtres. ATS-ready, adaptés à chaque offre, en 15 minutes — avec aperçu live.',
  path: '/',
});

export default function LandingPage() {
  return <LandingPageContent />;
}

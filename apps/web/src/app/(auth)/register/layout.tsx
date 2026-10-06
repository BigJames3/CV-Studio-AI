import type { ReactNode } from 'react';
import { createPageMetadata } from '@/lib/seo';

export const metadata = createPageMetadata({
  title: 'Créer un compte',
  description: 'Créez votre CV avec l’IA en quelques minutes. Plan Gratuit, sans carte bancaire.',
  path: '/register',
});

export default function RegisterLayout({ children }: { children: ReactNode }) {
  return children;
}

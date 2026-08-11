import type { Metadata, Viewport } from 'next';
import {
  Inter,
  JetBrains_Mono,
  Montserrat,
  Poppins,
  Lato,
  Fraunces,
  Source_Sans_3,
} from 'next/font/google';
import { AppProviders } from '@/providers/app-providers';
import { absoluteUrl } from '@/lib/utils';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains',
  display: 'swap',
});

const montserrat = Montserrat({
  subsets: ['latin'],
  variable: '--font-montserrat',
  display: 'swap',
});

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-poppins',
  display: 'swap',
});

const lato = Lato({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-lato',
  display: 'swap',
});

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-landing-display',
  display: 'swap',
});

const sourceSans = Source_Sans_3({
  subsets: ['latin'],
  variable: '--font-landing-body',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(absoluteUrl()),
  title: {
    default: 'CV Studio AI',
    template: '%s · CV Studio AI',
  },
  description: 'Des CV qui passent les filtres. ATS-ready, adaptés à chaque offre, en 15 minutes.',
  applicationName: 'CV Studio AI',
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f4f7f6' },
    { media: '(prefers-color-scheme: dark)', color: '#0b1f2a' },
  ],
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${jetbrains.variable} ${montserrat.variable} ${poppins.variable} ${lato.variable} ${fraunces.variable} ${sourceSans.variable}`}
      >
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-white"
        >
          Aller au contenu
        </a>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}

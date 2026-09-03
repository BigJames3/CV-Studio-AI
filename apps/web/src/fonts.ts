import {
  Inter,
  JetBrains_Mono,
  Montserrat,
  Poppins,
  Lato,
  Fraunces,
  Source_Sans_3,
} from 'next/font/google';

// Polices Google avec fallback (pas besoin d'Internet car cached)
export const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
  fallback: ['system-ui', 'sans-serif'],
});

export const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains',
  display: 'swap',
  fallback: ['monospace'],
});

export const montserrat = Montserrat({
  subsets: ['latin'],
  variable: '--font-montserrat',
  display: 'swap',
  fallback: ['sans-serif'],
});

export const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-poppins',
  display: 'swap',
  fallback: ['sans-serif'],
});

export const lato = Lato({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-lato',
  display: 'swap',
  fallback: ['sans-serif'],
});

export const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-landing-display',
  display: 'swap',
  fallback: ['serif'],
});

export const sourceSans = Source_Sans_3({
  subsets: ['latin'],
  variable: '--font-landing-body',
  display: 'swap',
  fallback: ['sans-serif'],
});

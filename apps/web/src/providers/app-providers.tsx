'use client';

import type { ReactNode } from 'react';
import { Toaster } from 'sonner';
import { AnalyticsRuntime } from '@/components/analytics/analytics-runtime';
import { ConsentBanner } from '@/components/analytics/consent-banner';
import { LogoutSync } from '@/components/auth/logout-sync';
import { SentryLoader } from '@/components/observability/sentry-loader';
import { QueryProvider } from './query-provider';
import { ThemeProvider } from './theme-provider';

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <QueryProvider>
      <ThemeProvider>
        <SentryLoader />
        <AnalyticsRuntime />
        <LogoutSync />
        {children}
        <ConsentBanner />
        <Toaster position="bottom-right" richColors closeButton />
      </ThemeProvider>
    </QueryProvider>
  );
}

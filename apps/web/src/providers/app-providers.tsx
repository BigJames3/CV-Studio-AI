'use client';

import type { ReactNode } from 'react';
import { Toaster } from 'sonner';
import { LogoutSync } from '@/components/auth/logout-sync';
import { QueryProvider } from './query-provider';
import { ThemeProvider } from './theme-provider';
import { AnalyticsProvider } from './analytics-provider';

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <QueryProvider>
      <ThemeProvider>
        <AnalyticsProvider>
          <LogoutSync />
          {children}
          <Toaster position="bottom-right" richColors closeButton />
        </AnalyticsProvider>
      </ThemeProvider>
    </QueryProvider>
  );
}

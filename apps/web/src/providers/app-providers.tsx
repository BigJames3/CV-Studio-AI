'use client';

import type { ReactNode } from 'react';
import { Toaster } from 'sonner';
import { LogoutSync } from '@/components/auth/logout-sync';
import { QueryProvider } from './query-provider';
import { ThemeProvider } from './theme-provider';

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <QueryProvider>
      <ThemeProvider>
        <LogoutSync />
        {children}
        <Toaster position="bottom-right" richColors closeButton />
      </ThemeProvider>
    </QueryProvider>
  );
}

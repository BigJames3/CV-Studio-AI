'use client';

import { useEffect, type ReactNode } from 'react';
import { useUiStore } from '@/stores/ui-store';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const theme = useUiStore((s) => s.theme);

  useEffect(() => {
    const root = document.documentElement;
    const preferDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const dark = theme === 'dark' || (theme === 'system' && preferDark);
    root.classList.toggle('dark', dark);
    root.dataset.theme = dark ? 'dark' : 'light';
  }, [theme]);

  return children;
}

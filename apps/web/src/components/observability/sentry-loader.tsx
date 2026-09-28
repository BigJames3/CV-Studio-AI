'use client';

import { useEffect } from 'react';
import { loadSentry } from '@/lib/sentry-client';

/** Starts browser error reporting once the page is interactive. */
export function SentryLoader() {
  useEffect(() => {
    void loadSentry();
  }, []);
  return null;
}

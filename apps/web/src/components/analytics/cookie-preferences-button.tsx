'use client';

import { openCookiePreferences } from '@/lib/analytics/consent';
import { cn } from '@/lib/utils';

export function CookiePreferencesButton({ className }: { className?: string }) {
  return (
    <button
      type="button"
      className={cn('text-left', className)}
      onClick={openCookiePreferences}
      data-testid="cookie-preferences-link"
    >
      Préférences cookies
    </button>
  );
}

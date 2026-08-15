'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { disableAnalytics, enableAnalytics } from '@/lib/analytics';
import { isPostHogConfigured, shouldAutoEnable } from '@/lib/analytics/posthog-client';

export function ConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!isPostHogConfigured()) return;
    if (shouldAutoEnable()) return;
    if (typeof window === 'undefined') return;
    const stored = window.localStorage.getItem('cv_analytics_consent');
    if (stored === 'granted' || stored === 'denied') return;
    setVisible(true);
  }, []);

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Consentement analytics"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-surface-card p-4 shadow-2"
    >
      <div className="mx-auto flex max-w-content flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-content-secondary">
          Nous mesurons l’usage du produit (pages, inscriptions, paiements) pour l’améliorer. Aucun
          contenu de CV n’est envoyé.
        </p>
        <div className="flex shrink-0 gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              disableAnalytics();
              setVisible(false);
            }}
          >
            Refuser
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => {
              enableAnalytics();
              setVisible(false);
            }}
          >
            Accepter
          </Button>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useMe } from '@/hooks';
import {
  GEO_CONSENT_CHANGED_EVENT,
  getGeoConsent,
  hasDoNotTrackEnabled,
  setGeoConsent,
} from '@/lib/geo';

export function GeoConsentBanner() {
  const { data: user, isLoading } = useMe();
  const [show, setShow] = useState(false);

  useEffect(() => {
    const sync = () => {
      if (isLoading) return;
      if (!user || hasDoNotTrackEnabled() || user.countryCode) {
        setShow(false);
        return;
      }
      setShow(getGeoConsent() === null);
    };

    sync();
    window.addEventListener(GEO_CONSENT_CHANGED_EVENT, sync);
    return () => window.removeEventListener(GEO_CONSENT_CHANGED_EVENT, sync);
  }, [isLoading, user]);

  if (!show) return null;

  return (
    <div
      data-testid="geo-consent-banner"
      role="dialog"
      aria-label="Consentement localisation"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface-card p-4 shadow-2"
    >
      <div className="mx-auto flex max-w-content flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-content-primary">Améliorer votre expérience</p>
          <p className="mt-1 text-sm text-content-secondary">
            Nous utilisons votre localisation pour vous suggérer la meilleure méthode de paiement.
            Votre adresse IP n’est jamais stockée ni partagée.
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            data-testid="geo-consent-decline"
            onClick={() => {
              setGeoConsent(false);
              setShow(false);
            }}
          >
            Refuser
          </Button>
          <Button
            type="button"
            size="sm"
            data-testid="geo-consent-accept"
            onClick={() => {
              setGeoConsent(true);
              setShow(false);
            }}
          >
            Accepter
          </Button>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useEffect, useId, useRef, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { disableAnalytics, enableAnalytics } from '@/lib/analytics';
import { OPEN_PREFERENCES_EVENT, readConsent } from '@/lib/analytics/consent';
import { isPostHogConfigured } from '@/lib/analytics/posthog-client';

type Mode = 'hidden' | 'banner' | 'preferences';

/**
 * Asks before any non-essential tracker runs. Today the only one is audience measurement
 * (PostHog), loaded only when NEXT_PUBLIC_POSTHOG_KEY is set: without it there is nothing
 * to consent to and the banner stays hidden, but the preferences still open from the footer.
 */
export function ConsentBanner() {
  const [mode, setMode] = useState<Mode>('hidden');
  const [analytics, setAnalytics] = useState(false);
  const configured = isPostHogConfigured();
  const titleId = useId();
  const firstAction = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (configured && readConsent() === null) setMode('banner');

    const open = () => {
      setAnalytics(readConsent() === 'granted');
      setMode('preferences');
    };
    window.addEventListener(OPEN_PREFERENCES_EVENT, open);
    return () => window.removeEventListener(OPEN_PREFERENCES_EVENT, open);
  }, [configured]);

  useEffect(() => {
    if (mode === 'preferences') firstAction.current?.focus();
  }, [mode]);

  if (mode === 'hidden') return null;

  const save = (granted: boolean) => {
    if (granted) enableAnalytics();
    else disableAnalytics();
    setMode('hidden');
  };

  return (
    <div
      role="dialog"
      aria-labelledby={titleId}
      data-testid="cookie-consent"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-surface-card p-4 shadow-2"
      onKeyDown={(event) => {
        if (event.key === 'Escape' && mode === 'preferences') setMode('hidden');
      }}
    >
      <div className="mx-auto max-w-content">
        <h2 id={titleId} className="text-sm font-semibold text-content-primary">
          {mode === 'banner' ? 'Cookies et mesure d’audience' : 'Préférences cookies'}
        </h2>

        {mode === 'banner' ? (
          <p className="mt-1 text-sm text-content-secondary">
            Avec votre accord, nous mesurons l’usage du site (pages vues, inscriptions, paiements)
            avec PostHog pour l’améliorer. Aucun contenu de CV n’est envoyé. Refuser n’a aucun effet
            sur le service.{' '}
            <Link href="/cookie-policy" className="text-primary underline">
              Politique cookies
            </Link>
          </p>
        ) : (
          <div className="mt-2 space-y-3 text-sm text-content-secondary">
            <p>
              <strong className="text-content-primary">Strictement nécessaires</strong> (toujours
              actifs) : session de connexion, sécurité, brouillon de l’éditeur, mémorisation de ce
              choix.
            </p>
            <label className="flex items-start gap-2">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 rounded border-border"
                checked={analytics}
                disabled={!configured}
                onChange={(event) => setAnalytics(event.target.checked)}
                data-testid="cookie-consent-analytics"
              />
              <span>
                <strong className="text-content-primary">Mesure d’audience</strong> (PostHog) :
                pages vues et étapes clés, pour améliorer le produit.
                {!configured && ' Non utilisée actuellement sur ce site.'}
              </span>
            </label>
            <p>
              <Link href="/cookie-policy" className="text-primary underline">
                Politique cookies
              </Link>
            </p>
          </div>
        )}

        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            ref={firstAction}
            type="button"
            variant="outline"
            size="sm"
            onClick={() => save(false)}
            data-testid="cookie-consent-refuse"
          >
            Tout refuser
          </Button>
          {mode === 'banner' ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setAnalytics(false);
                setMode('preferences');
              }}
              data-testid="cookie-consent-customize"
            >
              Personnaliser
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => save(configured && analytics)}
              data-testid="cookie-consent-save"
            >
              Enregistrer mes choix
            </Button>
          )}
          <Button
            type="button"
            size="sm"
            onClick={() => save(configured)}
            data-testid="cookie-consent-accept"
          >
            Tout accepter
          </Button>
        </div>
      </div>
    </div>
  );
}

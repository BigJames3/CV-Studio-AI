'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { getGeoConsent, hasDoNotTrackEnabled, setGeoConsent } from '@/lib/geo';

export default function PrivacySettingsPage() {
  const [geoConsent, setGeoConsentState] = useState<boolean | null>(null);
  const [dnt, setDnt] = useState(false);

  useEffect(() => {
    setGeoConsentState(getGeoConsent());
    setDnt(hasDoNotTrackEnabled());
  }, []);

  function updateConsent(next: boolean) {
    setGeoConsent(next);
    setGeoConsentState(next);
  }

  return (
    <div className="mx-auto max-w-content px-4 py-8" data-testid="privacy-page">
      <h1 className="text-3xl font-semibold">Confidentialité</h1>
      <p className="mt-2 text-sm text-content-secondary">
        Contrôlez comment nous utilisons votre localisation pour les paiements.
      </p>

      <section className="mt-8 rounded-lg border border-border bg-surface-card p-6">
        <h2 className="text-xl font-semibold">Localisation</h2>
        {dnt ? (
          <p className="mt-3 text-sm text-content-secondary" data-testid="privacy-dnt-notice">
            Do Not Track est activé dans votre navigateur. Nous n’utilisons pas votre adresse IP
            pour suggérer un moyen de paiement.
          </p>
        ) : (
          <label className="mt-4 flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 accent-primary"
              data-testid="geo-consent-toggle"
              checked={geoConsent === true}
              onChange={(event) => updateConsent(event.target.checked)}
            />
            <span>
              Autoriser l’utilisation de ma localisation pour améliorer les paiements
              <span className="mt-1 block text-content-secondary">
                Votre adresse IP sera utilisée uniquement pour suggérer Stripe ou CinetPay. Elle
                n’est jamais stockée ni partagée.
              </span>
            </span>
          </label>
        )}
        {geoConsent === false && !dnt ? (
          <p className="mt-3 text-sm text-content-secondary">
            Préférence enregistrée. Stripe restera le choix par défaut tant qu’aucun pays n’est
            renseigné dans votre profil.
          </p>
        ) : null}
      </section>

      <section className="mt-6 rounded-lg border border-border bg-surface-card p-6">
        <h2 className="text-xl font-semibold">Comment nous utilisons votre localisation</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-content-secondary">
          <li>
            <strong className="font-medium text-content-primary">Source :</strong> en-têtes géo du
            reverse proxy (à partir de votre adresse IP), uniquement avec votre accord.
          </li>
          <li>
            <strong className="font-medium text-content-primary">Usage :</strong> suggérer Stripe ou
            CinetPay. Vous pouvez toujours changer de méthode.
          </li>
          <li>
            <strong className="font-medium text-content-primary">Stockage :</strong> aucun stockage
            permanent de votre adresse IP.
          </li>
          <li>
            <strong className="font-medium text-content-primary">Partage :</strong> jamais partagé
            avec des tiers.
          </li>
          <li>
            <strong className="font-medium text-content-primary">Contrôle :</strong> acceptez ou
            refusez à tout moment ici.
          </li>
        </ul>
      </section>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/privacy">
          <Button type="button" variant="outline">
            Politique de confidentialité
          </Button>
        </Link>
        <Link href="/terms">
          <Button type="button" variant="ghost">
            Conditions d’utilisation
          </Button>
        </Link>
        <Link href="/account/billing">
          <Button type="button" variant="ghost">
            Retour à la facturation
          </Button>
        </Link>
        <Link href="/account/settings">
          <Button type="button" variant="ghost">
            Paramètres
          </Button>
        </Link>
      </div>
    </div>
  );
}

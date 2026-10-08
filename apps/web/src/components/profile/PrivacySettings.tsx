'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { authApi, usersApi, type UserProfile } from '@/lib/api';
import { ApiError } from '@/lib/api/client';
import { openCookiePreferences } from '@/lib/analytics/consent';
import { resetAnalytics } from '@/lib/analytics';
import { useAuthStore } from '@/stores/auth-store';

function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code === 'INVALID_CREDENTIALS') return 'Mot de passe incorrect.';
    if (error.code === 'PASSWORD_REQUIRED') return 'Saisissez votre mot de passe.';
    if (error.code === 'EMAIL_CONFIRMATION_REQUIRED')
      return 'Saisissez exactement l’adresse e-mail du compte.';
    if (error.status === 429) return 'Trop de tentatives. Réessayez dans une minute.';
  }
  return 'L’opération a échoué. Réessayez ou contactez le support.';
}

export function PrivacySettings({ user }: { user: UserProfile }) {
  const qc = useQueryClient();
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [secret, setSecret] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const needsPassword = user.hasPassword !== false;

  const downloadExport = async () => {
    setExporting(true);
    setExportError(null);
    try {
      const data = await usersApi.exportMe();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `cvstudio-mes-donnees-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      // The file only exists in this tab's memory; release it once the download started.
      setTimeout(() => URL.revokeObjectURL(url), 1_000);
    } catch (error) {
      setExportError(errorMessage(error));
    } finally {
      setExporting(false);
    }
  };

  const deleteAccount = async () => {
    setDeleting(true);
    setDeleteError(null);
    try {
      await usersApi.deleteMe(needsPassword ? { password: secret } : { confirmEmail: secret });
      await authApi.logout().catch(() => undefined);
      resetAnalytics();
      qc.clear();
      useAuthStore.getState().clearSession();
      window.location.assign('/?compte=supprime');
    } catch (error) {
      setDeleteError(errorMessage(error));
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-8" data-testid="privacy-settings">
      <section>
        <h2 className="text-lg font-semibold">Mes données</h2>
        <p className="mt-1 text-sm text-content-secondary">
          Téléchargez une copie des données de votre compte (profil, CV, historique IA, abonnement,
          sessions…) au format JSON. Le fichier est généré à la demande et n’est stocké nulle part.
          Le détail de ce qu’il ne contient pas figure dans le fichier. Voir la{' '}
          <Link href="/privacy" className="text-primary underline">
            politique de confidentialité
          </Link>
          .
        </p>
        <Button
          type="button"
          variant="secondary"
          className="mt-3"
          disabled={exporting}
          onClick={downloadExport}
          data-testid="privacy-export"
        >
          {exporting ? 'Préparation…' : 'Télécharger mes données'}
        </Button>
        {exportError && (
          <p className="mt-2 text-sm text-error" role="alert">
            {exportError}
          </p>
        )}
      </section>

      <section>
        <h2 className="text-lg font-semibold">Cookies</h2>
        <p className="mt-1 text-sm text-content-secondary">
          Modifiez ou retirez votre consentement à la mesure d’audience.
        </p>
        <Button type="button" variant="secondary" className="mt-3" onClick={openCookiePreferences}>
          Préférences cookies
        </Button>
      </section>

      <section className="rounded-md border border-error/40 p-4">
        <h2 className="text-lg font-semibold text-error">Supprimer mon compte</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-content-secondary">
          <li>Vos CV, versions, rapports ATS, historique IA et portfolios sont effacés.</li>
          <li>
            Un abonnement en cours est résilié immédiatement, sans remboursement automatique de la
            période restante (voir la{' '}
            <Link href="/refund-policy" className="text-primary underline">
              politique de remboursement
            </Link>
            ).
          </li>
          <li>
            Les factures et paiements sont conservés pour nos obligations comptables, rattachés à un
            compte anonymisé.
          </li>
          <li>Cette action est irréversible.</li>
        </ul>

        {!confirming ? (
          <Button
            type="button"
            variant="destructive"
            className="mt-4"
            onClick={() => setConfirming(true)}
            data-testid="privacy-delete-start"
          >
            Supprimer mon compte
          </Button>
        ) : (
          <form
            className="mt-4 space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              void deleteAccount();
            }}
          >
            <div>
              <Label htmlFor="delete-confirmation">
                {needsPassword
                  ? 'Mot de passe actuel'
                  : `Saisissez l’adresse e-mail du compte (${user.email})`}
              </Label>
              <Input
                id="delete-confirmation"
                type={needsPassword ? 'password' : 'email'}
                autoComplete={needsPassword ? 'current-password' : 'off'}
                value={secret}
                onChange={(event) => setSecret(event.target.value)}
                required
                data-testid="privacy-delete-confirmation"
              />
            </div>
            {deleteError && (
              <p className="text-sm text-error" role="alert">
                {deleteError}
              </p>
            )}
            <div className="flex gap-2">
              <Button
                type="submit"
                variant="destructive"
                disabled={deleting || !secret}
                data-testid="privacy-delete-confirm"
              >
                {deleting ? 'Suppression…' : 'Supprimer définitivement'}
              </Button>
              <Button
                type="button"
                variant="ghost"
                disabled={deleting}
                onClick={() => {
                  setConfirming(false);
                  setSecret('');
                  setDeleteError(null);
                }}
              >
                Annuler
              </Button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}

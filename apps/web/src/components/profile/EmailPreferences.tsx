'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys, usersApi, type UserProfile } from '@/lib/api';

/** Reminder and tip e-mails on/off (account and billing e-mails are always sent). */
export function EmailPreferences({ user }: { user: UserProfile }) {
  const qc = useQueryClient();
  const [enabled, setEnabled] = useState(!user.lifecycleEmailsOptOut);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = async (next: boolean) => {
    setEnabled(next);
    setSaving(true);
    setError(null);
    try {
      const updated = await usersApi.setLifecycleEmails(next);
      qc.setQueryData(queryKeys.user.me(), (prev: UserProfile | undefined) =>
        prev ? { ...prev, lifecycleEmailsOptOut: updated.lifecycleEmailsOptOut } : prev
      );
    } catch {
      setEnabled(!next);
      setError('Impossible d’enregistrer votre choix. Réessayez.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="space-y-3" data-testid="email-preferences">
      <label className="flex items-start gap-3">
        <input
          type="checkbox"
          className="mt-1 h-4 w-4 rounded border-border"
          checked={enabled}
          disabled={saving}
          onChange={(e) => toggle(e.target.checked)}
          data-testid="lifecycle-emails-toggle"
        />
        <span>
          <span className="font-medium">Conseils et rappels</span>
          <span className="block text-sm text-content-secondary">
            CV à terminer, score ATS, nouveautés : au plus un e-mail tous les 3 jours.
          </span>
        </span>
      </label>
      <p className="text-xs text-content-muted">
        Les e-mails liés à votre compte (vérification, mot de passe) et à votre abonnement (fin
        d’essai, paiement) sont toujours envoyés.
      </p>
      {error ? (
        <p className="text-sm text-error" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}

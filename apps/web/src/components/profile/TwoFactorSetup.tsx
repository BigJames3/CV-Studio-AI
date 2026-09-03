'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { authApi, queryKeys } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';

type SetupState = {
  secret: string;
  qrCodeDataUrl: string;
} | null;

export function TwoFactorSetup({ enabled }: { enabled?: boolean }) {
  const qc = useQueryClient();
  const [setup, setSetup] = useState<SetupState>(null);
  const [code, setCode] = useState('');
  const [disableCode, setDisableCode] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);

  async function startEnable() {
    setBusy(true);
    setError(null);
    try {
      const res = await authApi.enable2fa();
      setSetup({ secret: res.secret, qrCodeDataUrl: res.qrCodeDataUrl });
      setMessage(null);
    } catch {
      setError('Impossible de démarrer la 2FA');
    } finally {
      setBusy(false);
    }
  }

  async function confirmEnable() {
    setBusy(true);
    setError(null);
    try {
      const res = await authApi.verify2fa(code);
      setSetup(null);
      setCode('');
      setBackupCodes(res.backupCodes ?? null);
      setMessage('2FA activée. Enregistrez vos codes de secours.');
      await qc.invalidateQueries({ queryKey: queryKeys.user.me() });
    } catch {
      setError('Code invalide');
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    setError(null);
    try {
      await authApi.disable2fa(disableCode);
      setDisableCode('');
      setMessage('2FA désactivée');
      await qc.invalidateQueries({ queryKey: queryKeys.user.me() });
    } catch {
      setError('Code invalide');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="mt-8 space-y-4 rounded-lg border border-border p-4"
      data-testid="two-factor-setup"
    >
      <h2 className="text-lg font-semibold">Authentification à deux facteurs (TOTP)</h2>
      <p className="text-sm text-content-secondary">
        Sécurisez votre compte avec une app type Google Authenticator ou Authy.
      </p>

      {enabled ? (
        <div className="space-y-3">
          <p className="text-sm text-success">2FA activée</p>
          <div>
            <Label htmlFor="disable-totp">Code pour désactiver</Label>
            <Input
              id="disable-totp"
              value={disableCode}
              onChange={(e) => setDisableCode(e.target.value)}
              maxLength={6}
              inputMode="numeric"
            />
          </div>
          <Button
            type="button"
            variant="secondary"
            disabled={busy || disableCode.length !== 6}
            onClick={disable}
          >
            Désactiver la 2FA
          </Button>
        </div>
      ) : setup ? (
        <div className="space-y-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={setup.qrCodeDataUrl} alt="QR code 2FA" className="h-[220px] w-[220px]" />
          <p className="break-all font-mono text-xs text-content-secondary">{setup.secret}</p>
          <div>
            <Label htmlFor="enable-totp">Code de confirmation</Label>
            <Input
              id="enable-totp"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              maxLength={6}
              inputMode="numeric"
            />
          </div>
          <Button type="button" disabled={busy || code.length !== 6} onClick={confirmEnable}>
            Confirmer
          </Button>
        </div>
      ) : (
        <Button type="button" disabled={busy} onClick={startEnable}>
          Activer la 2FA
        </Button>
      )}

      {backupCodes && backupCodes.length > 0 && (
        <div className="rounded-md border border-border p-3">
          <p className="text-sm font-medium">Codes de secours (à conserver hors-ligne)</p>
          <ul className="mt-2 font-mono text-xs">
            {backupCodes.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </div>
      )}

      {message && <p className="text-sm text-success">{message}</p>}
      {error && <p className="text-sm text-error">{error}</p>}
    </div>
  );
}

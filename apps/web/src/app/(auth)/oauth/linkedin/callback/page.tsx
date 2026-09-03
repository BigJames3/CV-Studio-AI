'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { authApi } from '@/lib/api';
import { sanitizeNextPath } from '@/lib/safe-next';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';

export default function LinkedInOAuthCallbackPage() {
  const router = useRouter();
  const search = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [tempToken, setTempToken] = useState<string | null>(null);
  const [totp, setTotp] = useState('');

  useEffect(() => {
    const code = search.get('code');
    const state = search.get('state');
    const storedNext = sanitizeNextPath(sessionStorage.getItem('oauth_next'));

    if (!code) {
      setError('Code OAuth manquant');
      return;
    }

    const redirectUri = `${window.location.origin}/auth/oauth/linkedin/callback`;
    void authApi
      .oauthLinkedIn({ code, redirectUri, state: state ?? undefined })
      .then((result) => {
        if ('requires2fa' in result && result.tempToken) {
          setTempToken(result.tempToken);
          return;
        }
        router.replace(storedNext);
      })
      .catch(() => setError('Échec de la connexion LinkedIn'));
  }, [router, search]);

  if (error) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4">
        <p className="text-error">{error}</p>
      </div>
    );
  }

  if (tempToken) {
    return (
      <form
        className="mx-auto flex min-h-dvh max-w-md flex-col justify-center space-y-4 px-4"
        onSubmit={(e) => {
          e.preventDefault();
          void authApi
            .complete2fa(tempToken, totp)
            .then(() => router.replace(sanitizeNextPath(sessionStorage.getItem('oauth_next'))))
            .catch(() => setError('Code 2FA invalide'));
        }}
      >
        <p className="text-sm text-content-secondary">
          Entrez le code de votre application d’authentification.
        </p>
        <div>
          <Label htmlFor="linkedin-totp">Code 2FA</Label>
          <Input
            id="linkedin-totp"
            value={totp}
            onChange={(ev) => setTotp(ev.target.value)}
            autoComplete="one-time-code"
            maxLength={16}
          />
        </div>
        <Button type="submit" disabled={totp.length < 6}>
          Valider
        </Button>
      </form>
    );
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 text-sm">
      Connexion LinkedIn…
    </div>
  );
}

'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { authApi } from '@/lib/api';
import { sanitizeNextPath } from '@/lib/safe-next';

/**
 * LinkedIn OAuth (OpenID) — server-issued CSRF state, then redirect to LinkedIn.
 * Requires NEXT_PUBLIC_LINKEDIN_CLIENT_ID and a registered redirect URI.
 */
export function LinkedInSignInButton({ nextPath = '/dashboard' }: { nextPath?: string }) {
  const clientId = process.env.NEXT_PUBLIC_LINKEDIN_CLIENT_ID;
  const [busy, setBusy] = useState(false);
  const redirectUri = useMemo(() => {
    if (typeof window === 'undefined') return '';
    return `${window.location.origin}/auth/oauth/linkedin/callback`;
  }, []);

  if (!clientId) {
    return (
      <Button type="button" variant="secondary" className="w-full" disabled>
        LinkedIn (non configuré)
      </Button>
    );
  }

  return (
    <Button
      type="button"
      variant="secondary"
      className="w-full"
      disabled={busy}
      onClick={() => {
        void (async () => {
          setBusy(true);
          try {
            const { state, next } = await authApi.createOAuthState(
              'linkedin',
              sanitizeNextPath(nextPath)
            );
            sessionStorage.setItem('oauth_next', next);
            const params = new URLSearchParams({
              response_type: 'code',
              client_id: clientId,
              redirect_uri: redirectUri,
              state,
              scope: 'openid profile email',
            });
            window.location.href = `https://www.linkedin.com/oauth/v2/authorization?${params}`;
          } catch {
            setBusy(false);
          }
        })();
      }}
    >
      Continuer avec LinkedIn
    </Button>
  );
}

'use client';

import { useMemo } from 'react';
import { Button } from '@/components/ui/button';

/**
 * LinkedIn OAuth (OpenID) — redirects to LinkedIn authorize, then posts code to API.
 * Requires NEXT_PUBLIC_LINKEDIN_CLIENT_ID and a registered redirect URI.
 */
export function LinkedInSignInButton({ nextPath = '/dashboard' }: { nextPath?: string }) {
  const clientId = process.env.NEXT_PUBLIC_LINKEDIN_CLIENT_ID;
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
      onClick={() => {
        const state = btoa(JSON.stringify({ next: nextPath }));
        const params = new URLSearchParams({
          response_type: 'code',
          client_id: clientId,
          redirect_uri: redirectUri,
          state,
          scope: 'openid profile email',
        });
        window.location.href = `https://www.linkedin.com/oauth/v2/authorization?${params}`;
      }}
    >
      Continuer avec LinkedIn
    </Button>
  );
}

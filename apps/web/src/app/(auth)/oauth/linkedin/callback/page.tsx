'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { authApi } from '@/lib/api';

export default function LinkedInOAuthCallbackPage() {
  const router = useRouter();
  const search = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const code = search.get('code');
    const stateRaw = search.get('state');
    let next = '/dashboard';
    try {
      if (stateRaw) {
        const parsed = JSON.parse(atob(stateRaw)) as { next?: string };
        if (parsed.next) next = parsed.next;
      }
    } catch {
      /* ignore */
    }

    if (!code) {
      setError('Code OAuth manquant');
      return;
    }

    const redirectUri = `${window.location.origin}/auth/oauth/linkedin/callback`;
    void authApi
      .oauthLinkedIn({ code, redirectUri })
      .then(() => router.replace(next))
      .catch(() => setError('Échec de la connexion LinkedIn'));
  }, [router, search]);

  if (error) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4">
        <p className="text-error">{error}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 text-sm">
      Connexion LinkedIn…
    </div>
  );
}

'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { authApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { ApiError } from '@/lib/api/client';

type Props = { nextPath?: string };

/**
 * Renders Google Identity Services button when NEXT_PUBLIC_GOOGLE_CLIENT_ID is set.
 * Sends the resulting id_token to POST /auth/oauth/google.
 */
export function GoogleSignInButton({ nextPath = '/dashboard' }: Props) {
  const router = useRouter();
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const btnRef = useRef<HTMLDivElement>(null);

  const onCredential = useCallback(
    async (credential: string) => {
      setError(null);
      try {
        await authApi.oauthGoogle({ idToken: credential });
        router.push(nextPath);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Connexion Google impossible');
      }
    },
    [nextPath, router]
  );

  useEffect(() => {
    if (!clientId || !btnRef.current) return;
    let cancelled = false;

    (async () => {
      try {
        await loadGisScript();
        if (cancelled || !btnRef.current || !window.google?.accounts?.id) return;
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: (response: { credential?: string }) => {
            if (response.credential) void onCredential(response.credential);
          },
        });
        window.google.accounts.id.renderButton(btnRef.current, {
          theme: 'outline',
          size: 'large',
          width: btnRef.current.offsetWidth || 320,
          text: 'continue_with',
        });
        if (!cancelled) setReady(true);
      } catch {
        if (!cancelled) setError('Impossible de charger Google Sign-In');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [clientId, onCredential]);

  if (!clientId) {
    return (
      <Button type="button" className="w-full" disabled>
        Google (configurer NEXT_PUBLIC_GOOGLE_CLIENT_ID)
      </Button>
    );
  }

  return (
    <div className="space-y-2">
      <div ref={btnRef} className="flex min-h-10 w-full justify-center" />
      {!ready && !error && (
        <p className="text-center text-xs text-content-secondary">Chargement Google…</p>
      )}
      {error && <p className="text-sm text-error">{error}</p>}
    </div>
  );
}

function loadGisScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') return reject(new Error('SSR'));
    if (window.google?.accounts?.id) return resolve();
    const existing = document.getElementById('google-gis');
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('GIS load failed')));
      return;
    }
    const script = document.createElement('script');
    script.id = 'google-gis';
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('GIS load failed'));
    document.head.appendChild(script);
  });
}

declare global {
  interface Window {
    google?: {
      accounts?: {
        id: {
          initialize: (cfg: unknown) => void;
          renderButton: (el: HTMLElement, cfg: unknown) => void;
        };
      };
    };
  }
}

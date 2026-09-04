'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import { authApi } from '@/lib/api';
import { ApiError } from '@/lib/api/client';

function VerifyEmailPageInner() {
  const search = useSearchParams();
  const token = search.get('token') ?? '';
  const [status, setStatus] = useState<'idle' | 'ok' | 'error'>('idle');
  const [message, setMessage] = useState('Vérification en cours…');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Lien de vérification manquant.');
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        await authApi.verifyEmail(token);
        if (!cancelled) {
          setStatus('ok');
          setMessage('Email vérifié. Vous pouvez vous connecter.');
        }
      } catch (err) {
        if (!cancelled) {
          setStatus('error');
          setMessage(err instanceof ApiError ? err.message : 'Lien invalide ou expiré.');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4">
      <h1 className="text-2xl font-semibold">Vérification email</h1>
      <p className={`mt-4 text-sm ${status === 'error' ? 'text-error' : ''}`}>{message}</p>
      <Link href="/login" className="mt-6 text-sm text-primary">
        Aller à la connexion
      </Link>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 text-sm">
          Chargement…
        </div>
      }
    >
      <VerifyEmailPageInner />
    </Suspense>
  );
}

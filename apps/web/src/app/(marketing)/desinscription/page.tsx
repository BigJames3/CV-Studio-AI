'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { Button } from '@/components/ui/button';
import { emailsApi } from '@/lib/api';

/**
 * Link from the footer of reminder e-mails. The unsubscription needs a click: link scanners
 * that open (and sometimes run) e-mail links must not unsubscribe people.
 */
function UnsubscribeInner() {
  const search = useSearchParams();
  const u = search.get('u') ?? '';
  const t = search.get('t') ?? '';
  const [status, setStatus] = useState<'idle' | 'busy' | 'done' | 'error'>(
    u && t ? 'idle' : 'error'
  );

  const confirm = async () => {
    setStatus('busy');
    try {
      await emailsApi.unsubscribe(u, t);
      setStatus('done');
    } catch {
      setStatus('error');
    }
  };

  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center" data-testid="unsubscribe-page">
      <h1 className="text-2xl font-semibold">Conseils et rappels par e-mail</h1>
      {status === 'done' ? (
        <p className="mt-4 text-content-secondary" data-testid="unsubscribe-done">
          C’est fait : vous ne recevrez plus nos conseils et rappels. Les e-mails liés à votre
          compte et à votre abonnement continueront d’arriver.
        </p>
      ) : status === 'error' ? (
        <p className="mt-4 text-error" role="alert" data-testid="unsubscribe-error">
          Ce lien de désinscription n’est pas valide. Vous pouvez aussi gérer vos e-mails depuis{' '}
          <Link href="/account/settings" className="underline">
            vos paramètres
          </Link>
          .
        </p>
      ) : (
        <>
          <p className="mt-4 text-content-secondary">
            Vous ne recevrez plus nos conseils et rappels (CV à terminer, score ATS, nouveautés).
          </p>
          <Button
            className="mt-6"
            onClick={confirm}
            disabled={status === 'busy'}
            data-testid="unsubscribe-confirm"
          >
            {status === 'busy' ? 'Un instant…' : 'Me désinscrire'}
          </Button>
        </>
      )}
    </div>
  );
}

export default function UnsubscribePage() {
  return (
    <Suspense fallback={null}>
      <UnsubscribeInner />
    </Suspense>
  );
}

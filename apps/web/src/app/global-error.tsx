'use client';

import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="fr">
      <body>
        <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4">
          <h1 className="text-xl font-semibold">Une erreur est survenue</h1>
          <p className="mt-2 text-sm text-neutral-600">
            L’équipe a été notifiée. Vous pouvez réessayer.
          </p>
          <button
            type="button"
            className="mt-6 rounded-md bg-neutral-900 px-4 py-2 text-sm text-white"
            onClick={() => reset()}
          >
            Réessayer
          </button>
        </main>
      </body>
    </html>
  );
}

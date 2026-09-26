'use client';

import { useState } from 'react';
import Link from 'next/link';
import { marketplaceApi } from '@/lib/api';
import { ApiError } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { useMe } from '@/hooks/useMe';

export function BuyLicenceButton({ listingId }: { listingId: string }) {
  const { data: user, isLoading } = useMe();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (isLoading) {
    return (
      <Button disabled className="mt-4 w-full sm:w-auto">
        Chargement…
      </Button>
    );
  }

  if (!user) {
    return (
      <Link
        href={`/login?next=/marketplace/${listingId}`}
        className="mt-4 inline-block w-full sm:w-auto"
      >
        <Button className="w-full" data-testid="marketplace-buy">
          Se connecter pour acheter
        </Button>
      </Link>
    );
  }

  async function onBuy() {
    setError(null);
    setPending(true);
    try {
      const { url } = await marketplaceApi.createCheckout(listingId);
      window.location.assign(url);
    } catch (err) {
      if (err instanceof ApiError && (err.status === 401 || err.code === 'UNAUTHORIZED')) {
        window.location.assign(`/login?next=/marketplace/${listingId}`);
        return;
      }
      setError(err instanceof Error ? err.message : 'Paiement indisponible pour le moment.');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mt-4">
      <Button
        className="w-full sm:w-auto"
        data-testid="marketplace-buy"
        disabled={pending}
        onClick={() => void onBuy()}
      >
        {pending ? 'Redirection…' : 'Acheter la licence'}
      </Button>
      {error ? (
        <p className="mt-2 text-sm text-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

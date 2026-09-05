'use client';

import { useState } from 'react';
import Link from 'next/link';
import { marketplaceApi } from '@/lib/api';
import { ApiError } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { useMe, useUserPlan } from '@/hooks/useMe';
import { useFeatureGate } from '@/hooks/useFeatureGate';

export function BuyLicenceButton({ listingId }: { listingId: string }) {
  const { data: user, isLoading } = useMe();
  const { isFree } = useUserPlan();
  const { showUpgrade } = useFeatureGate();
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

  if (isFree) {
    return (
      <Button
        className="mt-4 w-full sm:w-auto"
        data-testid="marketplace-buy"
        onClick={() => showUpgrade('marketplace:buy')}
      >
        Passer Pro pour acheter
      </Button>
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
      if (err instanceof ApiError && (err.status === 403 || err.code === 'ENTITLEMENT_REQUIRED')) {
        showUpgrade('marketplace:buy');
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

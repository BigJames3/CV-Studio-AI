'use client';

import { useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { marketplaceApi, paymentsApi, queryKeys } from '@/lib/api';
import { useMe } from '@/hooks/useMe';
import { BuyLicenceButton } from '@/components/marketplace/buy-licence-button';
import { UseLicenceButton } from '@/components/marketplace/use-licence-button';

/**
 * Buy or use, from the licence the API reports. Back from Stripe, the session id is sent to
 * /payments/checkout/confirm, which reads the payment from Stripe: the redirect proves nothing.
 */
export function LicenceAction({
  listingId,
  title,
  checkoutSessionId,
}: {
  listingId: string;
  title: string;
  checkoutSessionId: string | null;
}) {
  const { data: user, isLoading: userLoading } = useMe();
  const qc = useQueryClient();
  const confirmed = useRef(false);

  const licence = useQuery({
    queryKey: queryKeys.marketplaceLicence(listingId),
    queryFn: () => marketplaceApi.licence(listingId),
    enabled: Boolean(user),
    // Until the payment is applied, poll briefly after the redirect.
    refetchInterval: (query) =>
      checkoutSessionId && query.state.data?.status === 'none' ? 3_000 : false,
  });

  useEffect(() => {
    if (!user || !checkoutSessionId || confirmed.current) return;
    confirmed.current = true;
    paymentsApi
      .confirmCheckout(checkoutSessionId)
      .catch(() => undefined) // the webhook applies it anyway
      .finally(
        () => void qc.invalidateQueries({ queryKey: queryKeys.marketplaceLicence(listingId) })
      );
  }, [user, checkoutSessionId, listingId, qc]);

  if (!user || userLoading) return <BuyLicenceButton listingId={listingId} />;

  const status = licence.data?.status;
  if (status === 'active' || status === 'owner') {
    return (
      <div data-testid="marketplace-licence-active">
        <p className="mt-4 text-sm text-content-secondary">
          {status === 'owner' ? 'Votre modèle.' : 'Licence active.'}
        </p>
        <UseLicenceButton listingId={listingId} title={title} />
      </div>
    );
  }
  if (status === 'refunded') {
    return (
      <p className="mt-4 text-sm text-content-secondary" data-testid="marketplace-licence-refunded">
        Cet achat a été remboursé : la licence n’est plus active.
      </p>
    );
  }
  if (checkoutSessionId && status === 'none') {
    return (
      <p className="mt-4 text-sm" role="status" data-testid="marketplace-licence-pending">
        Paiement en cours de confirmation…
      </p>
    );
  }
  return <BuyLicenceButton listingId={listingId} />;
}

'use client';

import { useQuery } from '@tanstack/react-query';
import { queryKeys, subscriptionsApi } from '@/lib/api';

export type BillingStatus = 'free' | 'active' | 'canceling' | 'past_due' | 'canceled' | 'unknown';

function formatAccessDate(iso: string | null | undefined) {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function useSubscriptionStatus() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: queryKeys.subscription,
    queryFn: () => subscriptionsApi.me(),
    staleTime: 30_000,
    refetchOnMount: 'always',
  });

  if (isLoading) {
    return {
      status: 'unknown' as BillingStatus,
      displayStatus: 'Chargement…',
      message: '',
      isActive: false,
      isCanceling: false,
      isCanceled: false,
      isPastDue: false,
      isFree: false,
      canReactivate: false,
      subscriptionEndDate: null as string | null,
      cancelAtPeriodEnd: false,
      formattedEndDate: null as string | null,
      isLoading: true,
      isError,
      refetch,
    };
  }

  if (isError || !data) {
    return {
      status: 'unknown' as BillingStatus,
      displayStatus: 'Indisponible',
      message: '',
      isActive: false,
      isCanceling: false,
      isCanceled: false,
      isPastDue: false,
      isFree: true,
      canReactivate: false,
      subscriptionEndDate: null as string | null,
      cancelAtPeriodEnd: false,
      formattedEndDate: null as string | null,
      isLoading: false,
      isError,
      refetch,
    };
  }

  const tier = (data.tier ?? 'free').toString().toLowerCase();
  const status = (data.status ?? 'free') as BillingStatus;
  const endDate = data.currentPeriodEnd ?? data.subscriptionEndDate ?? null;
  const formattedEndDate = formatAccessDate(endDate);
  const cancelAtPeriodEnd = Boolean(data.cancelAtPeriodEnd);
  const isFree = tier === 'free' || status === 'free';
  const isCanceling = status === 'canceling' || (cancelAtPeriodEnd && !isFree);
  const isPastDue = status === 'past_due';
  const isCanceled = status === 'canceled';
  const isActive = status === 'active' && !isCanceling;

  let displayStatus = `Plan ${tier}`;
  let message = '';

  if (isFree && !isCanceled) {
    displayStatus = 'Plan Gratuit';
    message = '1 CV maximum';
  } else if (isActive) {
    displayStatus = `Plan ${tier} — Actif`;
    message = 'Votre abonnement est actif et se renouvelle automatiquement.';
  } else if (isCanceling) {
    displayStatus = `Plan ${tier} — Annulation programmée`;
    message = formattedEndDate
      ? `Accès jusqu'au ${formattedEndDate}. L'abonnement ne sera pas renouvelé.`
      : "Annulation programmée. L'abonnement ne sera pas renouvelé.";
  } else if (isPastDue) {
    displayStatus = `Plan ${tier} — Impayé`;
    message = 'Mettez à jour votre moyen de paiement pour éviter une interruption.';
  } else if (isCanceled) {
    displayStatus = 'Abonnement terminé';
    message = formattedEndDate ? `Expiré le ${formattedEndDate}.` : 'Votre abonnement est terminé.';
  }

  return {
    status,
    displayStatus,
    message,
    isActive,
    isCanceling,
    isCanceled,
    isPastDue,
    isFree,
    canReactivate: isCanceling,
    subscriptionEndDate: endDate,
    cancelAtPeriodEnd,
    formattedEndDate,
    isLoading: false,
    isError,
    refetch,
  };
}

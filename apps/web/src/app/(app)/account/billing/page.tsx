'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { PaymentMethodSelector } from '@/components/billing/payment-selector';
import { queryKeys, subscriptionsApi, paymentsApi, type PaymentHistoryItem } from '@/lib/api';
import { useMe, useSubscription, useUserPlan } from '@/hooks';
import { cn, suggestPaymentMethod, type PaymentProvider } from '@/lib/utils';
import {
  detectCountry,
  persistPaymentMethod,
  readSavedPaymentMethod,
  GEO_CONSENT_CHANGED_EVENT,
  type GeoLocation,
} from '@/lib/geo';
import { track } from '@/lib/analytics';

const POLL_INTERVAL_MS = 3000;
const POLL_TIMEOUT_SEC = 300;
const ACTIVATION_POLL_INTERVAL_MS = 500;
const ACTIVATION_POLL_MAX_ATTEMPTS = 60;

const PLANS = [
  {
    id: 'free' as const,
    name: 'Gratuit',
    description: '1 CV max',
  },
  {
    id: 'pro' as const,
    name: 'Pro',
    description: 'CV illimités',
  },
  {
    id: 'business' as const,
    name: 'Business',
    description: 'Tout illimité',
  },
] as const;

const STATUS_LABEL: Record<string, string> = {
  pending: 'En attente',
  completed: 'Payé',
  failed: 'Échoué',
  refunded: 'Remboursé',
};

function parseCheckoutState(value: string | null) {
  if (value === 'success' || value === 'pending' || value === 'cancel' || value === 'failed') {
    return value;
  }
  return null;
}

function formatPaymentAmount(amount: string | number, currency: string) {
  const n = typeof amount === 'string' ? Number(amount) : amount;
  const code = (currency || 'USD').toUpperCase();
  if (Number.isNaN(n)) return `— ${code}`;
  if (code === 'XOF' || code === 'XAF') {
    return `${Math.round(n).toLocaleString('fr-FR')} ${code}`;
  }
  return `${n.toFixed(2)} ${code}`;
}

function CheckoutBanner({
  variant,
  testId,
  title,
  children,
}: {
  variant: 'success' | 'info' | 'neutral' | 'error';
  testId: string;
  title: string;
  children?: React.ReactNode;
}) {
  const styles = {
    success:
      'border-[color:var(--cv-color-success)] bg-[color:var(--cv-color-success-subtle)] text-success',
    info: 'border-primary bg-primary-subtle text-primary',
    neutral: 'border-border bg-surface-app text-content-secondary',
    error: 'border-error bg-[color:var(--cv-color-error-subtle)] text-error',
  };

  return (
    <div
      className={cn('mb-6 rounded-lg border p-4', styles[variant])}
      data-testid={testId}
      role="alert"
    >
      <p className="font-semibold">{title}</p>
      {children}
    </div>
  );
}

export default function BillingPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-content px-4 py-8 text-sm">Chargement de la facturation…</div>
      }
    >
      <BillingPageContent />
    </Suspense>
  );
}

function BillingPageContent() {
  const router = useRouter();
  const params = useSearchParams();
  const queryClient = useQueryClient();
  const { data: user, isLoading, isError } = useMe();
  const { data: subData } = useSubscription();
  const { tier } = useUserPlan();

  const checkoutState = parseCheckoutState(params.get('checkout'));
  const provider = params.get('provider');
  const transactionId = params.get('tx');
  const checkoutErrorParam = params.get('error');

  const [paymentMethod, setPaymentMethod] = useState<PaymentProvider | null>(null);
  const [polledTier, setPolledTier] = useState<'free' | 'pro' | 'business' | null>(null);
  const [isPollingActivation, setIsPollingActivation] = useState(false);

  const [checkoutPending, setCheckoutPending] = useState<'pro' | 'business' | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [cancelConfirm, setCancelConfirm] = useState(false);
  const [cancelPending, setCancelPending] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [pollingTimeLeft, setPollingTimeLeft] = useState(POLL_TIMEOUT_SEC);

  const { data: paymentsData } = useQuery({
    queryKey: queryKeys.payments,
    queryFn: () => paymentsApi.history(),
    enabled: Boolean(user),
  });
  const { data: paymentMethods } = useQuery({
    queryKey: queryKeys.paymentMethods,
    queryFn: () => paymentsApi.methods(),
    enabled: Boolean(user),
  });
  const cinetpayAvailable = paymentMethods?.cinetpay !== false;

  const [geo, setGeo] = useState<GeoLocation>({
    countryCode: null,
    source: 'unknown',
    consentGiven: false,
  });
  const [consentEpoch, setConsentEpoch] = useState(0);

  useEffect(() => {
    const onConsentChange = () => setConsentEpoch((n) => n + 1);
    window.addEventListener(GEO_CONSENT_CHANGED_EVENT, onConsentChange);
    return () => window.removeEventListener(GEO_CONSENT_CHANGED_EVENT, onConsentChange);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void detectCountry(user?.countryCode).then((location) => {
      if (!cancelled) setGeo(location);
    });
    return () => {
      cancelled = true;
    };
  }, [user?.countryCode, consentEpoch]);

  useEffect(() => {
    const saved = readSavedPaymentMethod();
    if (saved) setPaymentMethod(saved);
  }, []);

  const suggestedProvider = suggestPaymentMethod(geo.countryCode ?? user?.countryCode);

  const selectedMethod: PaymentProvider =
    (paymentMethod ?? suggestedProvider) === 'cinetpay' && !cinetpayAvailable
      ? 'stripe'
      : (paymentMethod ?? suggestedProvider);
  const payments = paymentsData?.items ?? [];

  const subscription = subData?.subscription ?? null;
  const cancelAtPeriodEnd = Boolean(subscription?.cancelAtPeriodEnd);
  const periodEnd = subscription?.currentPeriodEnd
    ? new Date(subscription.currentPeriodEnd).toLocaleDateString('fr-FR')
    : null;

  const displayTier = polledTier || tier;
  const displayIsFree = displayTier === 'free';
  const displayIsPro = displayTier === 'pro';
  const displayIsBusiness = displayTier === 'business';
  const showPaymentSelector = displayIsFree || displayIsPro;

  useEffect(() => {
    if (checkoutState === 'success') {
      track('checkout_succeeded', { provider: provider ?? 'stripe' });
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.user.me() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.subscription }),
        queryClient.invalidateQueries({ queryKey: queryKeys.payments }),
      ]);
    }
    if (checkoutState === 'cancel') {
      track('checkout_cancelled', { provider: provider ?? undefined });
    }
    if (checkoutState === 'failed') {
      track('checkout_failed', { error: checkoutErrorParam ?? 'declined' });
    }
  }, [checkoutState, checkoutErrorParam, provider, queryClient]);

  useEffect(() => {
    if (checkoutState !== 'success') {
      setPolledTier(null);
      setIsPollingActivation(false);
      return;
    }

    if (tier !== 'free') {
      setPolledTier(tier);
      setIsPollingActivation(false);
      return;
    }

    setIsPollingActivation(true);
    let cancelled = false;
    let attempts = 0;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const poll = async () => {
      if (cancelled) return;
      try {
        const result = await subscriptionsApi.me();
        if (cancelled) return;
        if (result.tier && result.tier !== 'free') {
          setPolledTier(result.tier);
          setIsPollingActivation(false);
          await Promise.all([
            queryClient.invalidateQueries({ queryKey: queryKeys.user.me() }),
            queryClient.invalidateQueries({ queryKey: queryKeys.subscription }),
            queryClient.invalidateQueries({ queryKey: queryKeys.payments }),
          ]);
          return;
        }
      } catch (error) {
        console.warn('Subscription activation poll failed:', error);
      }

      attempts += 1;
      if (cancelled) return;
      if (attempts < ACTIVATION_POLL_MAX_ATTEMPTS) {
        timeoutId = setTimeout(() => {
          void poll();
        }, ACTIVATION_POLL_INTERVAL_MS);
      } else {
        setIsPollingActivation(false);
      }
    };

    void poll();

    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [checkoutState, queryClient, tier]);

  useEffect(() => {
    if (checkoutState !== 'pending' || !transactionId) return;

    setPollingTimeLeft(POLL_TIMEOUT_SEC);
    let cancelled = false;
    let interval: ReturnType<typeof setInterval> | undefined;

    const poll = async (decrement: boolean) => {
      if (cancelled) return;
      try {
        const result = await paymentsApi.getStatus(transactionId);
        if (cancelled) return;
        if (result.status === 'completed') {
          if (interval) clearInterval(interval);
          await Promise.all([
            queryClient.invalidateQueries({ queryKey: queryKeys.user.me() }),
            queryClient.invalidateQueries({ queryKey: queryKeys.subscription }),
            queryClient.invalidateQueries({ queryKey: queryKeys.payments }),
          ]);
          window.location.replace(`${window.location.pathname}?checkout=success`);
          return;
        }
        if (result.status === 'failed') {
          if (interval) clearInterval(interval);
          window.location.replace(`${window.location.pathname}?checkout=failed`);
          return;
        }
      } catch (error) {
        console.error('Polling error:', error);
      }

      if (!decrement || cancelled) return;
      setPollingTimeLeft((prev) => {
        if (prev <= POLL_INTERVAL_MS / 1000) {
          if (interval) clearInterval(interval);
          window.location.replace(`${window.location.pathname}?checkout=failed&error=timeout`);
          return 0;
        }
        return prev - POLL_INTERVAL_MS / 1000;
      });
    };

    void poll(false);
    interval = setInterval(() => {
      void poll(true);
    }, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      if (interval) clearInterval(interval);
    };
  }, [checkoutState, transactionId, queryClient]);

  const pollingMinutes = useMemo(
    () => Math.max(0, Math.floor(pollingTimeLeft / 60)),
    [pollingTimeLeft]
  );

  async function checkout(plan: 'pro' | 'business', interval: 'month' | 'year') {
    setCheckoutPending(plan);
    setCheckoutError(null);
    track('checkout_started', { plan, interval, payment_method: selectedMethod });
    persistPaymentMethod(selectedMethod);
    try {
      const { url } = await subscriptionsApi.checkout({
        plan,
        interval,
        paymentMethod: selectedMethod,
      });
      window.location.href = url;
    } catch {
      track('checkout_failed', { plan, interval, payment_method: selectedMethod });
      setCheckoutError('Le paiement a échoué. Réessayez ou utilisez une autre carte.');
      setCheckoutPending(null);
    }
  }

  async function confirmCancel() {
    setCancelPending(true);
    setCancelError(null);
    try {
      await subscriptionsApi.cancel();
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.subscription }),
        queryClient.invalidateQueries({ queryKey: queryKeys.user.me() }),
      ]);
      setCancelConfirm(false);
    } catch {
      setCancelError("Impossible d'annuler l'abonnement pour le moment.");
    } finally {
      setCancelPending(false);
    }
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-content px-4 py-8 text-sm">Chargement de la facturation…</div>
    );
  }

  if (isError || !user) {
    return (
      <div className="mx-auto max-w-content px-4 py-8 text-center">
        <p className="mb-4 text-sm text-error">
          Vous devez être connecté pour gérer votre abonnement.
        </p>
        <Link href="/login" className="text-sm text-primary underline">
          Se connecter
        </Link>
      </div>
    );
  }

  const displayName = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email;
  const activationConfirmed = checkoutState === 'success' && displayTier !== 'free';

  return (
    <div className="mx-auto max-w-content px-4 py-8" data-testid="billing-page">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold">Facturation</h1>
        <p className="mt-2 text-content-secondary">Gérez votre abonnement et votre facturation</p>
        <p className="mt-1 text-sm text-content-muted">{displayName}</p>
      </div>

      {checkoutState === 'success' ? (
        <CheckoutBanner
          variant={activationConfirmed ? 'success' : 'info'}
          testId="checkout-success-banner"
          title={activationConfirmed ? 'Abonnement activé !' : 'Paiement reçu'}
        >
          <p className="mt-1 text-sm" data-testid="checkout-activation-status">
            {activationConfirmed
              ? `Votre plan ${displayTier} est maintenant actif.`
              : `Activation en cours${isPollingActivation ? '…' : ''}`}
          </p>
        </CheckoutBanner>
      ) : null}

      {checkoutState === 'pending' ? (
        <CheckoutBanner
          variant="info"
          testId="checkout-pending-banner"
          title="Confirmation du paiement en cours…"
        >
          <p className="mt-1 text-sm">
            Vérification du statut
            {provider ? ` via ${provider}` : ''} (délai : {pollingMinutes} min)
          </p>
        </CheckoutBanner>
      ) : null}

      {checkoutState === 'cancel' ? (
        <CheckoutBanner
          variant="neutral"
          testId="checkout-cancel-banner"
          title="Paiement annulé. Vous pouvez réessayer à tout moment."
        />
      ) : null}

      {checkoutState === 'failed' ? (
        <CheckoutBanner
          variant="error"
          testId="checkout-failed-banner"
          title="Le paiement a échoué"
        >
          <p className="mt-1 text-sm">
            {checkoutErrorParam === 'timeout'
              ? 'La confirmation du paiement a expiré. Veuillez réessayer.'
              : 'Le paiement a été refusé. Vérifiez votre moyen de paiement et réessayez.'}
          </p>
        </CheckoutBanner>
      ) : null}

      <section className="mb-6 rounded-lg border border-border bg-surface-card p-6">
        <h2 className="text-xl font-semibold">Plan actuel</h2>
        <p className="mt-2 text-sm text-content-secondary">Vous êtes actuellement sur</p>
        <p data-testid="plan-badge" className="mt-1 text-2xl font-semibold capitalize">
          Plan {displayTier}
        </p>

        {cancelAtPeriodEnd && periodEnd ? (
          <p className="mt-3 text-sm text-warning" data-testid="cancel-pending">
            L&apos;abonnement se terminera le {periodEnd}. Vous conservez l&apos;accès jusqu&apos;à
            cette date.
          </p>
        ) : null}

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {PLANS.map((plan) => {
            const active = displayTier === plan.id;
            return (
              <div
                key={plan.id}
                className={cn(
                  'rounded-lg border p-4',
                  active ? 'border-primary bg-primary-subtle' : 'border-border bg-surface-app'
                )}
              >
                <p className="font-semibold">{plan.name}</p>
                <p className="mt-1 text-sm text-content-secondary">{plan.description}</p>
                {active ? <p className="mt-2 text-xs font-medium text-primary">Actuel</p> : null}
              </div>
            );
          })}
        </div>

        {showPaymentSelector ? (
          <div className="mt-6">
            <PaymentMethodSelector
              value={selectedMethod}
              onChange={(method) => {
                setPaymentMethod(method);
                persistPaymentMethod(method);
              }}
              suggestedProvider={suggestedProvider}
              geoSource={geo.source}
              disabled={checkoutPending !== null}
              cinetpayAvailable={cinetpayAvailable}
            />
          </div>
        ) : null}

        {checkoutError ? (
          <p className="mt-4 text-sm text-error" data-testid="checkout-error" role="alert">
            {checkoutError}
          </p>
        ) : null}

        {cancelError ? (
          <p className="mt-4 text-sm text-error" data-testid="cancel-error" role="alert">
            {cancelError}
          </p>
        ) : null}

        <div className="mt-6 flex flex-wrap gap-3">
          {displayIsFree ? (
            <>
              <Button
                data-testid="checkout-pro-month"
                data-plan="pro"
                disabled={checkoutPending !== null}
                onClick={() => void checkout('pro', 'month')}
              >
                {checkoutPending === 'pro' ? 'Redirection…' : 'Passer à Pro'}
              </Button>
              <Button
                variant="secondary"
                data-testid="checkout-pro-year"
                data-plan="pro"
                disabled={checkoutPending !== null}
                onClick={() => void checkout('pro', 'year')}
              >
                Pro annuel
              </Button>
              <Button
                variant="outline"
                data-testid="checkout-business-month"
                data-plan="business"
                disabled={checkoutPending !== null}
                onClick={() => void checkout('business', 'month')}
              >
                Upgrade to Business
              </Button>
            </>
          ) : null}

          {displayIsPro ? (
            <>
              <Button
                data-testid="checkout-business-month"
                data-plan="business"
                disabled={checkoutPending !== null}
                onClick={() => void checkout('business', 'month')}
              >
                {checkoutPending === 'business' ? 'Redirection…' : 'Passer à Business'}
              </Button>
              <Link href="/pricing">
                <Button variant="outline">Comparer les plans</Button>
              </Link>
            </>
          ) : null}

          {displayIsBusiness ? (
            <p className="text-sm text-content-secondary">
              Contactez le support pour les modifications de votre plan Business.
            </p>
          ) : null}

          {(displayIsPro || displayIsBusiness) && !cancelAtPeriodEnd ? (
            cancelConfirm ? (
              <div
                className="flex w-full flex-wrap items-center gap-2"
                data-testid="cancel-confirm-modal"
              >
                <p className="w-full text-sm text-content-secondary">
                  Confirmer l&apos;annulation ? L&apos;accès Pro/Business reste actif jusqu&apos;à
                  la fin de la période.
                </p>
                <Button
                  variant="destructive"
                  data-testid="cancel-subscription-confirm"
                  disabled={cancelPending}
                  onClick={() => void confirmCancel()}
                >
                  {cancelPending ? 'Annulation…' : "Confirmer l'annulation"}
                </Button>
                <Button
                  variant="outline"
                  data-testid="cancel-subscription-abort"
                  disabled={cancelPending}
                  onClick={() => setCancelConfirm(false)}
                >
                  Garder mon plan
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                data-testid="cancel-subscription"
                onClick={() => setCancelConfirm(true)}
              >
                Annuler l&apos;abonnement
              </Button>
            )
          ) : null}
        </div>
      </section>

      <section className="rounded-lg border border-border bg-surface-card p-6">
        <h2 className="text-xl font-semibold">Historique de facturation</h2>
        {payments.length > 0 ? (
          <div className="mt-4 overflow-x-auto" data-testid="payment-history">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-content-secondary">
                  <th className="py-2 pr-3 font-medium">Date</th>
                  <th className="py-2 pr-3 font-medium">Montant</th>
                  <th className="py-2 pr-3 font-medium">Méthode</th>
                  <th className="py-2 font-medium">Statut</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment: PaymentHistoryItem) => (
                  <tr key={payment.id} className="border-b border-border">
                    <td className="py-2 pr-3">
                      {new Date(payment.createdAt).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="py-2 pr-3">
                      {formatPaymentAmount(payment.amount, payment.currency)}
                    </td>
                    <td className="py-2 pr-3 capitalize">{payment.paymentMethod}</td>
                    <td className="py-2">{STATUS_LABEL[payment.status] ?? payment.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-2 text-sm text-content-secondary">Aucune facture pour le moment</p>
        )}
      </section>

      <details className="mt-6 rounded-lg border border-border bg-surface-card p-4 text-sm">
        <summary className="cursor-pointer font-medium text-content-primary">
          Comment nous utilisons votre localisation
        </summary>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-content-secondary">
          <li>Source : en-têtes géo (adresse IP) uniquement avec votre accord.</li>
          <li>Usage : suggérer Stripe ou CinetPay. Vous pouvez changer de méthode.</li>
          <li>Stockage : aucun stockage permanent de votre adresse IP.</li>
          <li>Partage : jamais partagé avec des tiers.</li>
          <li>
            Contrôle :{' '}
            <Link href="/account/privacy" className="text-primary underline">
              paramètres de confidentialité
            </Link>
            .
          </li>
        </ul>
      </details>

      <div className="mt-8">
        <Button type="button" variant="outline" onClick={() => router.push('/dashboard')}>
          ← Retour au Dashboard
        </Button>
      </div>
    </div>
  );
}

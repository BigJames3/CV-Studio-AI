'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { InvoiceHistory } from '@/components/billing/invoice-history';
import { BillingPlansSkeleton, PlanGrid } from '@/components/billing/plan-grid';
import { queryKeys, subscriptionsApi, paymentsApi, plansApi, invoicesApi } from '@/lib/api';
import { FALLBACK_PLANS, SUPPORT_BUSINESS_MAILTO } from '@/lib/billing/plans-catalog';
import { checkoutErrorMessage } from '@/lib/billing/checkout-error-message';
import { useMe, useSubscription, useUserPlan } from '@/hooks';
import { cn } from '@/lib/utils';
import { track } from '@/lib/analytics';

const ACTIVATION_POLL_INTERVAL_MS = 500;
const ACTIVATION_POLL_MAX_ATTEMPTS = 60;

function parseCheckoutState(value: string | null) {
  if (value === 'success' || value === 'cancel') {
    return value;
  }
  return null;
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

  const [polledTier, setPolledTier] = useState<'free' | 'pro' | 'business' | null>(null);
  const [isPollingActivation, setIsPollingActivation] = useState(false);

  const [checkoutPending, setCheckoutPending] = useState<'pro' | 'business' | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [cancelConfirm, setCancelConfirm] = useState(false);
  const [cancelPending, setCancelPending] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [billingPeriod, setBillingPeriod] = useState<'month' | 'year'>('month');

  const {
    data: plans,
    isLoading: plansLoading,
    isError: plansError,
  } = useQuery({
    queryKey: queryKeys.plans,
    queryFn: () => plansApi.list(),
    staleTime: 1000 * 60 * 60,
  });
  const { data: invoicesData, isLoading: invoicesLoading } = useQuery({
    queryKey: queryKeys.invoices,
    queryFn: () => invoicesApi.list(),
    enabled: Boolean(user),
  });
  const { data: paymentsData } = useQuery({
    queryKey: queryKeys.payments,
    queryFn: () => paymentsApi.history(),
    enabled: Boolean(user),
  });
  const payments = paymentsData?.items ?? [];
  const invoices = invoicesData?.items ?? [];

  const subscription = subData?.subscription ?? null;
  const cancelAtPeriodEnd = Boolean(subscription?.cancelAtPeriodEnd);
  const periodEnd = subscription?.currentPeriodEnd
    ? new Date(subscription.currentPeriodEnd).toLocaleDateString('fr-FR')
    : null;

  const displayTier = polledTier || tier;
  const displayIsFree = displayTier === 'free';
  const displayIsPro = displayTier === 'pro';
  const displayIsBusiness = displayTier === 'business';

  useEffect(() => {
    if (checkoutState === 'success') {
      track('checkout_succeeded', { provider: 'stripe' });
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.user.me() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.subscription }),
        queryClient.invalidateQueries({ queryKey: queryKeys.payments }),
        queryClient.invalidateQueries({ queryKey: queryKeys.invoices }),
      ]);
    }
    if (checkoutState === 'cancel') {
      track('checkout_cancelled', { provider: 'stripe' });
    }
  }, [checkoutState, queryClient]);

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
            queryClient.invalidateQueries({ queryKey: queryKeys.invoices }),
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

  async function checkout(plan: 'pro' | 'business', interval: 'month' | 'year') {
    setCheckoutPending(plan);
    setCheckoutError(null);
    track('checkout_started', { plan, interval, payment_method: 'stripe' });
    try {
      const { url } = await subscriptionsApi.checkout({ plan, interval });
      window.location.href = url;
    } catch (error) {
      track('checkout_failed', { plan, interval, payment_method: 'stripe' });
      setCheckoutError(checkoutErrorMessage(error));
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

  if (isLoading || (plansLoading && !plans && !plansError)) {
    return (
      <div className="mx-auto max-w-content px-4 py-8">
        <div className="mb-8 h-10 w-48 animate-pulse rounded bg-surface-app" />
        <BillingPlansSkeleton />
      </div>
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

  const catalog = plans && plans.length > 0 ? plans : FALLBACK_PLANS;
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

      {checkoutState === 'cancel' ? (
        <CheckoutBanner
          variant="neutral"
          testId="checkout-cancel-banner"
          title="Paiement annulé. Vous pouvez réessayer à tout moment."
        />
      ) : null}

      <section className="mb-6 rounded-lg border border-border bg-surface-card p-6">
        <h2 className="text-xl font-semibold">Plan actuel</h2>
        <p className="mt-2 text-sm text-content-secondary">Vous êtes actuellement sur</p>
        <p data-testid="plan-badge" className="mt-1 text-2xl font-semibold capitalize">
          Plan {displayTier}
        </p>
        <p className="mt-2 text-sm text-content-secondary">
          {displayIsFree
            ? 'Créez jusqu’à 1 CV. Passez à un plan supérieur pour débloquer plus de fonctionnalités.'
            : periodEnd
              ? `Renouvellement le ${periodEnd}`
              : null}
        </p>

        {cancelAtPeriodEnd && periodEnd ? (
          <p className="mt-3 text-sm text-warning" data-testid="cancel-pending">
            L&apos;abonnement se terminera le {periodEnd}. Vous conservez l&apos;accès jusqu&apos;à
            cette date.
          </p>
        ) : null}
      </section>

      <section className="mb-6">
        {plansError ? (
          <p className="mb-4 text-sm text-error" role="alert">
            Impossible de charger le détail des plans. Affichage du catalogue par défaut.
          </p>
        ) : null}
        {plansLoading && !plans && !plansError ? (
          <BillingPlansSkeleton />
        ) : (
          <PlanGrid
            plans={catalog}
            currentTier={displayTier}
            billingPeriod={billingPeriod}
            checkoutPending={checkoutPending}
            onPeriodChange={setBillingPeriod}
            onCheckout={(plan, interval) => void checkout(plan, interval)}
          />
        )}

        <p className="mt-4 text-sm text-content-secondary" data-testid="payment-provider-note">
          Paiement sécurisé par carte bancaire via Stripe.
        </p>

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

        {(displayIsPro || displayIsBusiness) && !cancelAtPeriodEnd ? (
          <div className="mt-6 flex flex-wrap gap-3">
            {cancelConfirm ? (
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
            )}
          </div>
        ) : null}

        {displayIsBusiness ? (
          <div className="mt-6 rounded-lg border border-border bg-surface-app p-6">
            <h2 className="text-lg font-semibold">Support Business</h2>
            <p className="mt-2 text-sm text-content-secondary">
              Besoin d’intégrations personnalisées ou d’aide sur votre compte ? Contactez notre
              équipe.
            </p>
            <a
              href={SUPPORT_BUSINESS_MAILTO}
              className="mt-4 inline-flex min-h-10 items-center rounded-md bg-content-primary px-4 text-sm font-medium text-white hover:opacity-90"
            >
              Contactez le support
            </a>
          </div>
        ) : null}
      </section>

      <InvoiceHistory invoices={invoices} payments={payments} invoicesLoading={invoicesLoading} />

      <div className="mt-8">
        <Button type="button" variant="outline" onClick={() => router.push('/dashboard')}>
          ← Retour au Dashboard
        </Button>
      </div>
    </div>
  );
}

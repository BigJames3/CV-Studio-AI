'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { PaymentMethodSelector } from '@/components/billing/payment-selector';
import {
  queryKeys,
  plansApi,
  subscriptionsApi,
  paymentsApi,
  invoicesApi,
  type PaymentHistoryItem,
  type InvoiceListItem,
} from '@/lib/api';
import { useMe, useSubscription, useUserPlan } from '@/hooks';
import { cn, suggestPaymentMethod, type PaymentProvider } from '@/lib/utils';
import { FALLBACK_PLANS, mergeCatalog, PLAN_DISPLAY_NAME } from '@/lib/billing/plans-catalog';
import { BillingPlanCards, type BillingPeriod } from '@/components/billing/plan-cards';
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

const INVOICE_STATUS_LABEL: Record<string, string> = {
  draft: 'Brouillon',
  sent: 'Émise',
  paid: 'Payée',
  void: 'Annulée',
  uncollectible: 'Impayée',
};

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

function PlanCardsSkeleton() {
  return (
    <div className="mt-6 grid gap-4 sm:grid-cols-3" aria-hidden>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="h-56 animate-pulse rounded-lg border border-border bg-surface-app"
        />
      ))}
    </div>
  );
}

function HistorySkeleton() {
  return (
    <div className="mt-4 space-y-2" aria-hidden>
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-10 animate-pulse rounded-md bg-surface-app" />
      ))}
    </div>
  );
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
        <div className="mx-auto max-w-content px-4 py-8">
          <div className="h-8 w-48 animate-pulse rounded bg-surface-app" />
          <PlanCardsSkeleton />
          <HistorySkeleton />
        </div>
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
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>('month');
  const [cancelConfirm, setCancelConfirm] = useState(false);
  const [cancelPending, setCancelPending] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [pollingTimeLeft, setPollingTimeLeft] = useState(POLL_TIMEOUT_SEC);

  const {
    data: paymentsData,
    isError: paymentsError,
    isPending: paymentsPending,
    refetch: refetchPayments,
  } = useQuery({
    queryKey: queryKeys.payments,
    queryFn: () => paymentsApi.history(),
    enabled: Boolean(user),
  });
  const {
    data: invoicesData,
    isError: invoicesError,
    isPending: invoicesPending,
    refetch: refetchInvoices,
  } = useQuery({
    queryKey: queryKeys.invoices,
    queryFn: () => invoicesApi.list(),
    enabled: Boolean(user),
  });
  const { data: plansData, isPending: plansPending } = useQuery({
    queryKey: queryKeys.plans,
    queryFn: plansApi.list,
    staleTime: 60 * 60 * 1000,
    initialData: { items: FALLBACK_PLANS },
  });
  const catalog = mergeCatalog(plansData.items);
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
  const invoices = invoicesData?.items ?? [];
  const historyError = paymentsError || invoicesError;
  const historyLoading = (paymentsPending && !paymentsData) || (invoicesPending && !invoicesData);

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
        queryClient.invalidateQueries({ queryKey: queryKeys.invoices }),
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
            queryClient.invalidateQueries({ queryKey: queryKeys.invoices }),
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

  async function downloadInvoice(id: string) {
    try {
      const result = await invoicesApi.download(id);
      if (result.url) {
        window.open(result.url, '_blank', 'noopener,noreferrer');
      }
    } catch {
      setCheckoutError('Impossible de télécharger la facture. Réessayez.');
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
      <div className="mx-auto max-w-content px-4 py-8">
        <div className="mb-8 h-8 w-48 animate-pulse rounded bg-surface-app" />
        <PlanCardsSkeleton />
        <div className="mt-6 rounded-lg border border-border bg-surface-card p-6">
          <HistorySkeleton />
        </div>
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
        <p data-testid="plan-badge" className="mt-1 text-2xl font-semibold">
          Plan {PLAN_DISPLAY_NAME[displayTier]}
        </p>
        {displayIsFree ? (
          <p className="mt-2 text-sm text-content-secondary">
            Créez jusqu&apos;à 1 CV. Passez à Pro pour l&apos;export PDF, le partage et l&apos;IA.
          </p>
        ) : periodEnd && !cancelAtPeriodEnd ? (
          <p className="mt-2 text-sm text-content-secondary">Renouvellement le {periodEnd}</p>
        ) : null}

        {cancelAtPeriodEnd && periodEnd ? (
          <p className="mt-3 text-sm text-warning" data-testid="cancel-pending">
            L&apos;abonnement se terminera le {periodEnd}. Vous conservez l&apos;accès jusqu&apos;à
            cette date.
          </p>
        ) : null}

        <div className="mt-8">
          <BillingPlanCards
            catalog={catalog}
            loading={plansPending && !plansData.items.length}
            displayTier={displayTier}
            billingPeriod={billingPeriod}
            onBillingPeriodChange={setBillingPeriod}
            checkoutPending={checkoutPending}
            onCheckout={(plan, interval) => void checkout(plan, interval)}
          />
        </div>

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

        {showPaymentSelector ? (
          <div className="mt-8">
            <h2 className="mb-4 text-xl font-semibold">Méthode de paiement</h2>
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

        {displayIsFree && showPaymentSelector && selectedMethod === 'stripe' ? (
          <p className="mt-3 text-sm text-content-secondary">
            {catalog.find((p) => p.slug === 'pro')?.trialDays ?? 14} jours d’essai avec Stripe
            (carte). Sans engagement.
          </p>
        ) : null}

        <div className="mt-6 flex flex-wrap gap-3">
          {displayIsPro ? (
            <Link href="/pricing">
              <Button variant="outline">Comparer les plans</Button>
            </Link>
          ) : null}

          {displayIsBusiness ? (
            <div className="w-full rounded-lg border border-border bg-surface-app p-4">
              <h3 className="text-sm font-semibold">Support Business</h3>
              <p className="mt-2 text-sm text-content-secondary">
                Besoin d’intégrations personnalisées ou d’une modification de plan ? Contactez notre
                équipe.
              </p>
              <a
                className="mt-3 inline-block text-sm font-medium text-primary underline"
                href="mailto:support@cvstudio.ai?subject=Support%20Business%20-%20CV%20Studio"
              >
                Contacter le support
              </a>
            </div>
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
        {historyLoading ? (
          <HistorySkeleton />
        ) : historyError ? (
          <div className="mt-3">
            <p className="text-sm text-error" role="alert">
              Impossible de charger l’historique. Réessayer.
            </p>
            <Button
              className="mt-3"
              variant="outline"
              type="button"
              onClick={() => {
                void refetchPayments();
                void refetchInvoices();
              }}
            >
              Réessayer
            </Button>
          </div>
        ) : invoices.length > 0 ? (
          <div className="mt-4 overflow-x-auto" data-testid="payment-history">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-content-secondary">
                  <th className="py-2 pr-3 font-medium">Date</th>
                  <th className="py-2 pr-3 font-medium">N°</th>
                  <th className="py-2 pr-3 font-medium">Montant</th>
                  <th className="py-2 pr-3 font-medium">Statut</th>
                  <th className="py-2 font-medium">PDF</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice: InvoiceListItem) => (
                  <tr key={invoice.id} className="border-b border-border">
                    <td className="py-2 pr-3">
                      {new Date(invoice.createdAt).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="py-2 pr-3">{invoice.invoiceNumber}</td>
                    <td className="py-2 pr-3">
                      {formatPaymentAmount(invoice.amount, invoice.currency)}
                    </td>
                    <td className="py-2 pr-3">
                      {INVOICE_STATUS_LABEL[invoice.status] ?? invoice.status}
                    </td>
                    <td className="py-2">
                      {invoice.pdfUrl ? (
                        <Button
                          type="button"
                          variant="outline"
                          className="h-8 px-2 text-xs"
                          onClick={() => void downloadInvoice(invoice.id)}
                        >
                          Télécharger
                        </Button>
                      ) : (
                        <span className="text-xs text-content-muted">PDF bientôt disponible</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : payments.length > 0 ? (
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
          <div className="mt-4 rounded-lg border border-primary bg-primary-subtle p-4">
            <p className="text-sm font-medium text-primary">Aucune facture pour le moment</p>
            <p className="mt-2 text-sm text-content-secondary">
              Après votre premier paiement, vos factures et reçus apparaîtront ici. Vous pourrez les
              télécharger en PDF.
            </p>
          </div>
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

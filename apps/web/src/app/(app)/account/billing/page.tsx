'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { queryKeys, subscriptionsApi } from '@/lib/api';
import { useInvoices, useMe, useSubscriptionStatus, useUserPlan } from '@/hooks';
import { cn } from '@/lib/utils';
import { Suspense, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { ApiError } from '@/lib/api/client';
import { track } from '@/lib/analytics';

const PLANS = [
  {
    id: 'free' as const,
    name: 'Gratuit',
    description: '1 CV max',
  },
  {
    id: 'pro' as const,
    name: 'Pro',
    description: 'CV illimités · $9.99/mois',
  },
  {
    id: 'business' as const,
    name: 'Business',
    description: 'Tout illimité · $29.99/mois',
  },
] as const;

function formatMoney(amount: string | number, currency: string) {
  const value = typeof amount === 'string' ? Number(amount) : amount;
  try {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: currency.toUpperCase() || 'USD',
    }).format(Number.isFinite(value) ? value : 0);
  } catch {
    return `${value} ${currency}`;
  }
}

function formatDate(iso: string | null | undefined) {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function statusLabel(status: string) {
  switch (status) {
    case 'paid':
      return 'Payée';
    case 'sent':
    case 'open':
      return 'Ouverte';
    case 'void':
      return 'Annulée';
    case 'uncollectible':
      return 'Irrécouvrable';
    case 'draft':
      return 'Brouillon';
    default:
      return status;
  }
}

function BillingPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { data: user, isLoading, isError } = useMe();
  const { tier, isFree, isPro } = useUserPlan();
  const billing = useSubscriptionStatus();
  const invoicesQuery = useInvoices(Boolean(user));
  const [checkoutPending, setCheckoutPending] = useState<'pro' | 'business' | null>(null);
  const [portalPending, setPortalPending] = useState(false);
  const [reactivatePending, setReactivatePending] = useState(false);
  const [reactivatedBanner, setReactivatedBanner] = useState(false);

  const checkoutStatus = searchParams.get('checkout');
  const highlightPlan = searchParams.get('plan');

  useEffect(() => {
    if (checkoutStatus === 'success') {
      track('checkout_succeeded');
      track('upgrade_completed');
      void queryClient.invalidateQueries({ queryKey: queryKeys.user.me() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.subscription });
      void queryClient.invalidateQueries({ queryKey: queryKeys.invoices });
    }
    if (checkoutStatus === 'cancel') {
      track('checkout_cancelled');
      track('upgrade_abandoned');
    }
  }, [checkoutStatus, queryClient]);

  async function checkout(plan: 'pro' | 'business', interval: 'month' | 'year') {
    setCheckoutPending(plan);
    track('upgrade_clicked', { plan, interval });
    track('checkout_started', { plan, interval });
    try {
      const { url } = await subscriptionsApi.checkout(plan, interval);
      window.location.href = url;
    } catch (err) {
      track('upgrade_failed', { plan, error: err instanceof Error ? err.message : 'unknown' });
      track('checkout_failed', { plan });
      setCheckoutPending(null);
    }
  }

  async function openPortal() {
    setPortalPending(true);
    track('portal_accessed');
    try {
      const { url } = await subscriptionsApi.portal();
      window.location.href = url;
    } catch {
      setPortalPending(false);
    }
  }

  async function reactivate() {
    setReactivatePending(true);
    try {
      const result = await subscriptionsApi.reactivate();
      await queryClient.invalidateQueries({ queryKey: queryKeys.subscription });
      await queryClient.invalidateQueries({ queryKey: queryKeys.user.me() });
      setReactivatedBanner(true);
      toast.success(
        result.alreadyActive
          ? 'Votre abonnement est déjà actif'
          : 'Abonnement réactivé — le renouvellement est rétabli'
      );
    } catch (err) {
      const code = err instanceof ApiError ? err.code : undefined;
      if (code === 'SUBSCRIPTION_ENDED' || code === 'STRIPE_SUBSCRIPTION_MISSING') {
        toast.error('Abonnement terminé. Choisissez un plan pour vous réabonner.');
      } else {
        toast.error('Impossible de réactiver. Réessayez ou ouvrez le portail Stripe.');
      }
    } finally {
      setReactivatePending(false);
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
  const invoices = invoicesQuery.data ?? [];

  return (
    <div className="mx-auto max-w-content px-4 py-8" data-testid="billing-page">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold">Facturation</h1>
        <p className="mt-2 text-content-secondary">Gérez votre abonnement et votre facturation</p>
        <p className="mt-1 text-sm text-content-muted">{displayName}</p>
      </div>

      {checkoutStatus === 'success' ? (
        <div
          className="mb-6 rounded-lg border border-success/30 bg-success/10 px-4 py-3 text-sm text-success"
          role="status"
        >
          Paiement réussi. Votre plan sera mis à jour sous quelques secondes.
        </div>
      ) : null}

      {checkoutStatus === 'cancel' ? (
        <div
          className="mb-6 rounded-lg border border-border bg-surface-app px-4 py-3 text-sm text-content-secondary"
          role="status"
        >
          Checkout annulé. Aucun débit n&apos;a été effectué.
        </div>
      ) : null}

      {reactivatedBanner ? (
        <div
          className="mb-6 rounded-lg border border-success/30 bg-success/10 px-4 py-3 text-sm text-success"
          role="status"
          data-testid="reactivated-banner"
        >
          Abonnement réactivé. Le renouvellement automatique est rétabli.
        </div>
      ) : null}

      <section className="mb-6 rounded-lg border border-border bg-surface-card p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">Plan actuel</h2>
            <p data-testid="plan-badge" className="mt-2 text-2xl font-semibold capitalize">
              {billing.displayStatus}
            </p>
            {billing.message ? (
              <p
                data-testid="subscription-status-message"
                className={cn(
                  'mt-2 text-sm',
                  billing.isCanceling || billing.isPastDue
                    ? 'text-warning'
                    : billing.isActive
                      ? 'text-success'
                      : 'text-content-secondary'
                )}
              >
                {billing.message}
              </p>
            ) : null}
          </div>

          {billing.isActive ? (
            <Badge
              data-testid="subscription-status-badge"
              className="border-transparent bg-success/15 text-success"
            >
              Actif
            </Badge>
          ) : null}
          {billing.isCanceling ? (
            <Badge data-testid="subscription-status-badge" variant="warning">
              Annulation programmée
            </Badge>
          ) : null}
          {billing.isPastDue ? (
            <Badge data-testid="subscription-status-badge" variant="warning">
              Impayé
            </Badge>
          ) : null}
          {billing.isCanceled ? (
            <Badge data-testid="subscription-status-badge" variant="outline">
              Terminé
            </Badge>
          ) : null}
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {PLANS.map((plan) => {
            const active = tier === plan.id;
            const highlighted = highlightPlan === plan.id && !active;
            return (
              <div
                key={plan.id}
                className={cn(
                  'rounded-lg border p-4',
                  active
                    ? 'border-primary bg-primary-subtle'
                    : highlighted
                      ? 'border-primary/50 bg-surface-app'
                      : 'border-border bg-surface-app'
                )}
              >
                <p className="font-semibold">{plan.name}</p>
                <p className="mt-1 text-sm text-content-secondary">{plan.description}</p>
                {active ? <p className="mt-2 text-xs font-medium text-primary">Actuel</p> : null}
              </div>
            );
          })}
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          {isFree ? (
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

          {isPro && !billing.isCanceling ? (
            <Button
              data-testid="checkout-business-month"
              data-plan="business"
              disabled={checkoutPending !== null}
              onClick={() => void checkout('business', 'month')}
            >
              {checkoutPending === 'business' ? 'Redirection…' : 'Passer à Business'}
            </Button>
          ) : null}

          {!isFree ? (
            <Button
              variant="outline"
              data-testid="manage-subscription"
              disabled={portalPending}
              onClick={() => void openPortal()}
            >
              {portalPending
                ? 'Redirection…'
                : billing.isCanceling
                  ? "Confirmer / gérer l'annulation"
                  : "Gérer l'abonnement"}
            </Button>
          ) : null}

          {billing.canReactivate ? (
            <Button
              data-testid="reactivate-subscription"
              disabled={reactivatePending}
              onClick={() => void reactivate()}
            >
              {reactivatePending ? 'Réactivation…' : 'Réactiver'}
            </Button>
          ) : null}

          {isPro && !billing.isCanceling ? (
            <Link href="/pricing">
              <Button variant="outline">Comparer les plans</Button>
            </Link>
          ) : null}
        </div>
      </section>

      <section
        className="rounded-lg border border-border bg-surface-card p-6"
        data-testid="billing-history"
      >
        <h2 className="text-xl font-semibold">Historique de facturation</h2>
        {invoicesQuery.isLoading ? (
          <p className="mt-2 text-sm text-content-secondary">Chargement des factures…</p>
        ) : invoices.length === 0 ? (
          <p className="mt-2 text-sm text-content-secondary">
            Aucune facture pour le moment. Elles apparaîtront ici après votre premier paiement.
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {invoices.map((invoice) => {
              const periodStart = formatDate(invoice.periodStart);
              const periodEnd = formatDate(invoice.periodEnd);
              const paidAt = formatDate(invoice.paidAt ?? invoice.createdAt);
              const isPaid = invoice.status === 'paid';

              return (
                <li
                  key={invoice.id}
                  data-testid="invoice-row"
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface-app px-4 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{invoice.invoiceNumber}</p>
                      <Badge
                        variant={isPaid ? 'default' : 'warning'}
                        className={
                          isPaid ? 'border-transparent bg-success/15 text-success' : undefined
                        }
                      >
                        {statusLabel(invoice.status)}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-content-secondary">
                      {periodStart && periodEnd
                        ? `${periodStart} – ${periodEnd}`
                        : paidAt
                          ? `Émise le ${paidAt}`
                          : null}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold">
                      {formatMoney(invoice.amount, invoice.currency)}
                    </p>
                    {invoice.pdfUrl ? (
                      <a
                        href={invoice.pdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary underline"
                        data-testid="invoice-pdf-link"
                      >
                        Télécharger PDF
                      </a>
                    ) : (
                      <p className="text-xs text-content-muted">PDF indisponible</p>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <div className="mt-8">
        <Button type="button" variant="outline" onClick={() => router.push('/dashboard')}>
          ← Retour au Dashboard
        </Button>
      </div>
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
      <BillingPageInner />
    </Suspense>
  );
}

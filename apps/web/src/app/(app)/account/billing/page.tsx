'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { subscriptionsApi } from '@/lib/api';
import { useMe, useUserPlan } from '@/hooks';
import { cn } from '@/lib/utils';
import { useState } from 'react';

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

export default function BillingPage() {
  const router = useRouter();
  const { data: user, isLoading, isError } = useMe();
  const { tier, isFree, isPro, isBusiness } = useUserPlan();
  const [checkoutPending, setCheckoutPending] = useState<'pro' | 'business' | null>(null);

  async function checkout(plan: 'pro' | 'business', interval: 'month' | 'year') {
    setCheckoutPending(plan);
    try {
      const { url } = await subscriptionsApi.checkout(plan, interval);
      window.location.href = url;
    } catch {
      setCheckoutPending(null);
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

  return (
    <div className="mx-auto max-w-content px-4 py-8" data-testid="billing-page">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold">Facturation</h1>
        <p className="mt-2 text-content-secondary">Gérez votre abonnement et votre facturation</p>
        <p className="mt-1 text-sm text-content-muted">{displayName}</p>
      </div>

      <section className="mb-6 rounded-lg border border-border bg-surface-card p-6">
        <h2 className="text-xl font-semibold">Plan actuel</h2>
        <p className="mt-2 text-sm text-content-secondary">Vous êtes actuellement sur</p>
        <p data-testid="plan-badge" className="mt-1 text-2xl font-semibold capitalize">
          Plan {tier}
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {PLANS.map((plan) => {
            const active = tier === plan.id;
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

          {isPro ? (
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

          {isBusiness ? (
            <p className="text-sm text-content-secondary">
              Contactez le support pour les modifications de votre plan Business.
            </p>
          ) : null}
        </div>
      </section>

      <section className="rounded-lg border border-border bg-surface-card p-6">
        <h2 className="text-xl font-semibold">Historique de facturation</h2>
        <p className="mt-2 text-sm text-content-secondary">Aucune facture pour le moment</p>
      </section>

      <div className="mt-8">
        <Button type="button" variant="outline" onClick={() => router.push('/dashboard')}>
          ← Retour au Dashboard
        </Button>
      </div>
    </div>
  );
}

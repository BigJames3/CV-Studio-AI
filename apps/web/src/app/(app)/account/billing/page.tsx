'use client';

import { Button } from '@/components/ui/button';
import { subscriptionsApi } from '@/lib/api';
import { useMe } from '@/hooks';

export default function BillingPage() {
  const { data: me } = useMe();
  const tier = me?.subscriptionTier ?? 'free';

  async function checkout(plan: 'pro' | 'business', interval: 'month' | 'year') {
    const { url } = await subscriptionsApi.checkout(plan, interval);
    window.location.href = url;
  }

  return (
    <div className="mx-auto max-w-content px-4 py-8">
      <h1 className="text-3xl font-semibold">Abonnement</h1>
      <p className="mt-2 text-[color:var(--cv-text-secondary)]">
        Gérez Pro / Business via Stripe Checkout.
      </p>
      <p className="mt-4 text-sm">
        Plan actuel:{' '}
        <span data-testid="plan-badge" className="font-semibold capitalize">
          {tier}
        </span>
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Button data-testid="checkout-pro-month" data-plan="pro" onClick={() => checkout('pro', 'month')}>
          Passer Pro (mensuel)
        </Button>
        <Button
          variant="secondary"
          data-testid="checkout-pro-year"
          data-plan="pro"
          onClick={() => checkout('pro', 'year')}
        >
          Pro annuel
        </Button>
        <Button
          variant="secondary"
          data-testid="checkout-business-month"
          data-plan="business"
          onClick={() => checkout('business', 'month')}
        >
          Upgrade to Business
        </Button>
      </div>
    </div>
  );
}

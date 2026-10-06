import type Stripe from 'stripe';

/*
 * Webhook payloads are rendered in the API version of the Stripe account (or of the endpoint),
 * not in the version pinned by this SDK. Since 2025-03-31.basil the billing period lives on the
 * subscription items. Read both. The period is always Stripe's, never computed here.
 */

type VersionedSubscriptionItem = Stripe.SubscriptionItem & {
  current_period_start?: number;
  current_period_end?: number;
};

export function subscriptionPeriod(stripeSub: Stripe.Subscription): { start: Date; end: Date } {
  const item = stripeSub.items?.data?.[0] as VersionedSubscriptionItem | undefined;
  const start = stripeSub.current_period_start ?? item?.current_period_start;
  const end = stripeSub.current_period_end ?? item?.current_period_end;
  if (!start || !end) {
    throw new Error(`Stripe subscription ${stripeSub.id} has no billing period`);
  }
  return { start: new Date(start * 1000), end: new Date(end * 1000) };
}

/** Stripe timestamp (seconds) to Date; `null` when Stripe has none. */
export function stripeDate(seconds: number | null | undefined): Date | null {
  return seconds ? new Date(seconds * 1000) : null;
}

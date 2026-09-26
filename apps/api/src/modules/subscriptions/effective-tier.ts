import { normalizeTier, type SubscriptionTierName } from '@cvstudio/shared-utils';

/** Tolerance after `currentPeriodEnd` for late renewal webhooks / CinetPay re-payment. */
export const EXPIRY_GRACE_MS = 72 * 60 * 60 * 1000;

/** How long a `past_due` subscription keeps paid access after the failed renewal. */
export const PAST_DUE_GRACE_MS = 7 * 24 * 60 * 60 * 1000;

export type TierSource = {
  subscriptionTier: string | null;
  subscriptionEndDate?: Date | null;
  subscription?: {
    status: string;
    currentPeriodStart: Date;
    currentPeriodEnd: Date;
  } | null;
};

/**
 * Tier the user is actually entitled to right now.
 *
 * `users.subscription_tier` is only written by checkout webhooks, so on its own it never
 * expires (CinetPay is a one-shot payment, and a missed Stripe webhook leaves it stale).
 * The subscription status and period end are the authority for paid tiers.
 */
export function resolveEffectiveTier(source: TierSource, now = new Date()): SubscriptionTierName {
  const stored = normalizeTier(source.subscriptionTier);
  if (stored === 'free') return 'free';

  const sub = source.subscription;
  if (!sub) {
    // Paid tier without a subscription row (manual grant): honour its end date if any.
    const end = source.subscriptionEndDate;
    return end && now.getTime() > end.getTime() + EXPIRY_GRACE_MS ? 'free' : stored;
  }

  const end = sub.currentPeriodEnd.getTime();
  switch (sub.status) {
    case 'active':
    case 'trialing':
      return now.getTime() > end + EXPIRY_GRACE_MS ? 'free' : stored;
    case 'past_due': {
      // The failed renewal happened at the old period end, or at the new period start once
      // Stripe has rolled the period forward — whichever is already in the past.
      const failedAt = end <= now.getTime() ? end : sub.currentPeriodStart.getTime();
      return now.getTime() > failedAt + PAST_DUE_GRACE_MS ? 'free' : stored;
    }
    default:
      // canceled, suspended, or anything unknown: fail closed.
      return 'free';
  }
}

/** Prisma `select` for `user.findUnique` that loads everything `resolveEffectiveTier` needs. */
export const TIER_SOURCE_SELECT = {
  subscriptionTier: true,
  subscriptionEndDate: true,
  subscription: {
    select: { status: true, currentPeriodStart: true, currentPeriodEnd: true },
  },
} as const;

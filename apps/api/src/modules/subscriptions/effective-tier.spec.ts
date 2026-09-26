import { EXPIRY_GRACE_MS, PAST_DUE_GRACE_MS, resolveEffectiveTier } from './effective-tier';

const NOW = new Date('2026-09-26T12:00:00Z');
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const at = (offsetMs: number) => new Date(NOW.getTime() + offsetMs);

function sub(status: string, periodStartOffset: number, periodEndOffset: number) {
  return {
    status,
    currentPeriodStart: at(periodStartOffset),
    currentPeriodEnd: at(periodEndOffset),
  };
}

describe('resolveEffectiveTier', () => {
  it('keeps free users free', () => {
    expect(resolveEffectiveTier({ subscriptionTier: 'free' }, NOW)).toBe('free');
    expect(resolveEffectiveTier({ subscriptionTier: null }, NOW)).toBe('free');
  });

  it('keeps an active subscription inside its period', () => {
    const source = { subscriptionTier: 'pro', subscription: sub('active', -10 * DAY, 20 * DAY) };
    expect(resolveEffectiveTier(source, NOW)).toBe('pro');
  });

  it('keeps a trialing subscription inside its trial', () => {
    const source = {
      subscriptionTier: 'business',
      subscription: sub('trialing', -2 * DAY, 12 * DAY),
    };
    expect(resolveEffectiveTier(source, NOW)).toBe('business');
  });

  it('tolerates a late renewal inside the grace window', () => {
    const source = {
      subscriptionTier: 'pro',
      subscription: sub('active', -31 * DAY, -EXPIRY_GRACE_MS + HOUR),
    };
    expect(resolveEffectiveTier(source, NOW)).toBe('pro');
  });

  it('downgrades an "active" subscription whose period ended (expired CinetPay)', () => {
    for (const tier of ['pro', 'business']) {
      const source = {
        subscriptionTier: tier,
        subscription: sub('active', -35 * DAY, -EXPIRY_GRACE_MS - HOUR),
      };
      expect(resolveEffectiveTier(source, NOW)).toBe('free');
    }
  });

  it('downgrades canceled and suspended subscriptions immediately', () => {
    for (const status of ['canceled', 'suspended', 'unknown']) {
      const source = { subscriptionTier: 'pro', subscription: sub(status, -1 * DAY, 29 * DAY) };
      expect(resolveEffectiveTier(source, NOW)).toBe('free');
    }
  });

  it('gives past_due a grace window after the failed renewal (period not rolled yet)', () => {
    const inGrace = { subscriptionTier: 'pro', subscription: sub('past_due', -33 * DAY, -3 * DAY) };
    expect(resolveEffectiveTier(inGrace, NOW)).toBe('pro');

    const expired = {
      subscriptionTier: 'pro',
      subscription: sub('past_due', -40 * DAY, -PAST_DUE_GRACE_MS - HOUR),
    };
    expect(resolveEffectiveTier(expired, NOW)).toBe('free');
  });

  it('gives past_due the same grace when Stripe already rolled the period forward', () => {
    const inGrace = { subscriptionTier: 'pro', subscription: sub('past_due', -3 * DAY, 27 * DAY) };
    expect(resolveEffectiveTier(inGrace, NOW)).toBe('pro');

    const expired = {
      subscriptionTier: 'business',
      subscription: sub('past_due', -PAST_DUE_GRACE_MS - HOUR, 20 * DAY),
    };
    expect(resolveEffectiveTier(expired, NOW)).toBe('free');
  });

  it('honours subscriptionEndDate for paid tiers without a subscription row', () => {
    expect(resolveEffectiveTier({ subscriptionTier: 'pro' }, NOW)).toBe('pro');
    expect(
      resolveEffectiveTier(
        { subscriptionTier: 'pro', subscriptionEndDate: at(-EXPIRY_GRACE_MS - HOUR) },
        NOW
      )
    ).toBe('free');
    expect(
      resolveEffectiveTier({ subscriptionTier: 'pro', subscriptionEndDate: at(5 * DAY) }, NOW)
    ).toBe('pro');
  });
});

/** Platform take rate — sellers keep (1 - TAKE_RATE). */
export const MARKETPLACE_TAKE_RATE = 0.3;

export function splitSale(grossCents: number, stripeFeeCents: number) {
  const net = Math.max(0, grossCents - stripeFeeCents);
  const platformFeeCents = Math.round(net * MARKETPLACE_TAKE_RATE);
  const sellerEarningCents = net - platformFeeCents;
  return { netCents: net, platformFeeCents, sellerEarningCents };
}

/** Blended US card estimate used until Stripe balance-transaction fees are known. */
export function estimateStripeFeeCents(grossCents: number) {
  return Math.round(grossCents * 0.029) + 30;
}

/**
 * Amount the platform retains on a destination charge so the seller still
 * receives 70% of net after the estimated processor fee.
 */
export function destinationApplicationFeeCents(grossCents: number, stripeFeeCents: number) {
  const { sellerEarningCents } = splitSale(grossCents, stripeFeeCents);
  return Math.max(0, grossCents - sellerEarningCents);
}

export const PRICE_MIN_CENTS = 499;
export const PRICE_MAX_CENTS = 4999;
export const PAYOUT_MIN_CENTS = 2500;

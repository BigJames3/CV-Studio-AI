/** Platform take rate — sellers keep (1 - TAKE_RATE). */
export const MARKETPLACE_TAKE_RATE = 0.3;

export function splitSale(grossCents: number, stripeFeeCents: number) {
  const net = Math.max(0, grossCents - stripeFeeCents);
  const platformFeeCents = Math.round(net * MARKETPLACE_TAKE_RATE);
  const sellerEarningCents = net - platformFeeCents;
  return { netCents: net, platformFeeCents, sellerEarningCents };
}

export const PRICE_MIN_CENTS = 499;
export const PRICE_MAX_CENTS = 4999;

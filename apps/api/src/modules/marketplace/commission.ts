/** Platform take rate — sellers keep (1 - TAKE_RATE). */
export const MARKETPLACE_TAKE_RATE = 0.3;

/*
 * Amounts are in the currency's subunit (× 100), as Paystack expects, XOF included:
 * 5 000 F CFA is 500_000. The `…Cents` names predate Paystack.
 */

export function splitSale(grossCents: number, processorFeeCents: number) {
  const net = Math.max(0, grossCents - processorFeeCents);
  const platformFeeCents = Math.round(net * MARKETPLACE_TAKE_RATE);
  const sellerEarningCents = net - platformFeeCents;
  return { netCents: net, platformFeeCents, sellerEarningCents };
}

/**
 * Processor fee estimate used to fix the seller's share before the payment exists (the split
 * is sent to Paystack with the transaction). The ledger records Paystack's actual fee.
 */
export const PROCESSOR_FEE_RATE = 0.035;

export function estimateProcessorFeeCents(grossCents: number) {
  return Math.round(grossCents * PROCESSOR_FEE_RATE);
}

/**
 * Amount the platform keeps on a split payment (Paystack `transaction_charge`), so the seller's
 * subaccount still receives 70% of net after the estimated processor fee.
 */
export function platformChargeCents(grossCents: number, processorFeeCents: number) {
  const { sellerEarningCents } = splitSale(grossCents, processorFeeCents);
  return Math.max(0, grossCents - sellerEarningCents);
}

/** Listing price bounds per currency, in subunits. */
const PRICE_LIMITS: Record<string, { min: number; max: number }> = {
  XOF: { min: 500_00, max: 50_000_00 },
  EUR: { min: 499, max: 4999 },
  USD: { min: 499, max: 4999 },
};

export function priceLimits(currency: string): { min: number; max: number } {
  return PRICE_LIMITS[currency.toUpperCase()] ?? PRICE_LIMITS.XOF;
}

/** Bounds the request DTO enforces whatever the currency; the service applies the real ones. */
export const PRICE_MIN_CENTS = 499;
export const PRICE_MAX_CENTS = 50_000_00;

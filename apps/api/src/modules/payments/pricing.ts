import { paymentCurrency } from './payment-env';

export type PaidPlan = 'pro' | 'business';
export type BillingInterval = 'month' | 'year';

export function isPaidPlan(value: unknown): value is PaidPlan {
  return value === 'pro' || value === 'business';
}

export function isBillingInterval(value: unknown): value is BillingInterval {
  return value === 'month' || value === 'year';
}

/** Fixed EUR → XOF parity (CFA franc, BCEAO): not a market rate. */
export const XOF_PER_EUR = 655.957;

/** Catalog prices (the `plans` table) are in EUR, major units. */
export type CatalogPrices = { monthly: number; yearly: number };

/**
 * Amount charged for a plan, in the payment currency's subunit (× 100, as Paystack expects).
 * `PAYSTACK_PRICE_<PLAN>_<MONTHLY|YEARLY>` (major units, e.g. 6500) overrides the catalog;
 * otherwise an EUR price is charged as is, or converted at the fixed parity for XOF and
 * rounded up to the next 100 F CFA. Any other currency needs the override: `null` (fail closed).
 */
export function planChargeAmount(
  plan: PaidPlan,
  interval: BillingInterval,
  catalog: CatalogPrices,
  currency = paymentCurrency()
): number | null {
  const suffix = interval === 'year' ? 'YEARLY' : 'MONTHLY';
  const override = Number(process.env[`PAYSTACK_PRICE_${plan.toUpperCase()}_${suffix}`]);
  if (Number.isFinite(override) && override > 0) return Math.round(override * 100);

  const eur = interval === 'year' ? catalog.yearly : catalog.monthly;
  if (!Number.isFinite(eur) || eur <= 0) return null;
  if (currency === 'EUR') return Math.round(eur * 100);
  if (currency === 'XOF') return Math.ceil((eur * XOF_PER_EUR) / 100) * 100 * 100;
  return null;
}

export function addInterval(from: Date, interval: BillingInterval): Date {
  const end = new Date(from);
  if (interval === 'year') end.setUTCFullYear(end.getUTCFullYear() + 1);
  else end.setUTCMonth(end.getUTCMonth() + 1);
  return end;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Prepaid access after a payment. Nothing renews by itself (Paystack has no recurring billing
 * in Côte d'Ivoire), so:
 * - the same plan bought again while active is added after the current end (early renewal);
 * - another plan starts now, and the unused part of the current one is credited at the ratio
 *   of the two plans' monthly prices (Pro → Business shortens it, Business → Pro lengthens it);
 * - with nothing active, the period starts now.
 */
export function prepaidPeriod(params: {
  now: Date;
  plan: PaidPlan;
  interval: BillingInterval;
  current: { plan: PaidPlan; start: Date; end: Date } | null;
  monthlyPrice: (plan: PaidPlan) => number;
}): { start: Date; end: Date } {
  const { now, plan, interval, current } = params;
  if (!current || current.end.getTime() <= now.getTime()) {
    return { start: now, end: addInterval(now, interval) };
  }
  if (current.plan === plan) {
    return { start: current.start, end: addInterval(current.end, interval) };
  }
  const remainingMs = current.end.getTime() - now.getTime();
  const from = params.monthlyPrice(current.plan);
  const to = params.monthlyPrice(plan);
  const creditMs = from > 0 && to > 0 ? Math.floor((remainingMs * from) / to / DAY_MS) * DAY_MS : 0;
  return { start: now, end: new Date(addInterval(now, interval).getTime() + creditMs) };
}

import { CATALOG_FALLBACK_ROWS } from '../plans/plans.service';
import { isNonPlaceholderSecret, isPaystackLiveAllowed, isPaystackLiveSecret } from './payment-env';
import type { PaystackClient } from './paystack.client';
import { planChargeAmount } from './pricing';

export type CheckLevel = 'ok' | 'warn' | 'error';
export type CheckResult = { level: CheckLevel; message: string };
type Env = Record<string, string | undefined>;

/** Events POST /payments/webhook handles. */
export const WEBHOOK_EVENTS = [
  'charge.success',
  'refund.processed',
  'charge.dispute.create',
  'charge.dispute.remind',
  'charge.dispute.resolve',
] as const;

const WEBHOOK_PATH = '/api/v1/payments/webhook';

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** `6 600 XOF`, `9.99 EUR`: plain spaces, whatever the ICU data of the machine. */
function formatAmount(subunits: number, currency: string): string {
  const major = subunits % 100 === 0 ? String(subunits / 100) : (subunits / 100).toFixed(2);
  return `${major.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} ${currency}`;
}

/**
 * Read-only check of the Paystack configuration (keys, prices, API access, webhook URL).
 * Paystack has no API to read the webhook URL or the subscription capability: those are
 * listed as reminders.
 */
export async function checkPaystackConfig(
  env: Env,
  paystack: Pick<PaystackClient, 'listBanks'> | null
): Promise<CheckResult[]> {
  const results: CheckResult[] = [];
  const key = env.PAYSTACK_SECRET_KEY;
  const currency = (env.PAYMENT_CURRENCY?.trim().toUpperCase() || 'XOF').slice(0, 3);

  if (!isNonPlaceholderSecret(key)) {
    results.push({ level: 'error', message: 'PAYSTACK_SECRET_KEY is missing (or a placeholder).' });
  } else if (!key.startsWith('sk_test_') && !key.startsWith('sk_live_')) {
    results.push({
      level: 'error',
      message: 'PAYSTACK_SECRET_KEY must start with sk_test_ or sk_live_.',
    });
  } else if (isPaystackLiveSecret(key)) {
    const allowed =
      env.PAYSTACK_ALLOW_LIVE !== undefined
        ? ['1', 'true', 'on'].includes(env.PAYSTACK_ALLOW_LIVE.trim().toLowerCase())
        : isPaystackLiveAllowed();
    results.push(
      allowed
        ? { level: 'ok', message: 'Live Paystack key, PAYSTACK_ALLOW_LIVE is set.' }
        : {
            level: 'error',
            message:
              'Live Paystack key without PAYSTACK_ALLOW_LIVE=1: the API will refuse to use it.',
          }
    );
  } else {
    results.push({ level: 'ok', message: 'Test Paystack key (sk_test_).' });
  }

  results.push({ level: 'ok', message: `Payment currency: ${currency}.` });
  for (const row of CATALOG_FALLBACK_ROWS.filter((r) => r.name !== 'Free')) {
    const plan = row.name.toLowerCase() as 'pro' | 'business';
    for (const interval of ['month', 'year'] as const) {
      const amount = planChargeAmount(
        plan,
        interval,
        { monthly: Number(row.priceMonthly), yearly: Number(row.priceYearly) },
        currency
      );
      results.push(
        amount
          ? {
              level: 'ok',
              message: `${row.name} / ${interval}: ${formatAmount(amount, currency)}.`,
            }
          : {
              level: 'error',
              message: `${row.name} / ${interval}: no ${currency} price. Set PAYSTACK_PRICE_${plan.toUpperCase()}_${interval === 'year' ? 'YEARLY' : 'MONTHLY'}.`,
            }
      );
    }
  }

  if (paystack) {
    try {
      const banks = await paystack.listBanks(currency);
      results.push({
        level: banks.length > 0 ? 'ok' : 'warn',
        message: `Paystack API reachable: ${banks.length} payout bank(s) / operator(s) in ${currency}.`,
      });
    } catch (error) {
      results.push({ level: 'error', message: `Paystack API call failed: ${errorMessage(error)}` });
    }
  }

  const apiUrl = (env.API_URL ?? env.NEXT_PUBLIC_API_URL ?? '')
    .replace(/\/api\/v1\/?$/, '')
    .replace(/\/$/, '');
  results.push({
    level: 'warn',
    message:
      `Check by hand in the Paystack dashboard (Settings → API Keys & Webhooks): webhook URL ` +
      `${apiUrl || '<API origin>'}${WEBHOOK_PATH}, and the events ${WEBHOOK_EVENTS.join(', ')}.`,
  });
  return results;
}

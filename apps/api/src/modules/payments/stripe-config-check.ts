import type Stripe from 'stripe';
import { CATALOG_FALLBACK_ROWS } from '../plans/plans.service';
import { isNonPlaceholderSecret, isStripeLiveSecret } from './payment-env';

export type CheckLevel = 'ok' | 'warn' | 'error';
export type CheckResult = { level: CheckLevel; message: string };
type Env = Record<string, string | undefined>;

/** Events POST /payments/webhook handles for the platform account. */
export const ACCOUNT_WEBHOOK_EVENTS = [
  'checkout.session.completed',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'invoice.paid',
  'invoice.payment_succeeded',
  'invoice.payment_failed',
] as const;

const WEBHOOK_PATH = '/api/v1/payments/webhook';

type PriceSlot = {
  plan: 'Pro' | 'Business';
  interval: 'month' | 'year';
  /** Env names read by checkout, in priority order (YEARLY, then its ANNUAL alias). */
  envNames: string[];
};

const PRICE_SLOTS: PriceSlot[] = [
  { plan: 'Pro', interval: 'month', envNames: ['STRIPE_PRICE_PRO_MONTHLY'] },
  {
    plan: 'Pro',
    interval: 'year',
    envNames: ['STRIPE_PRICE_PRO_YEARLY', 'STRIPE_PRICE_PRO_ANNUAL'],
  },
  { plan: 'Business', interval: 'month', envNames: ['STRIPE_PRICE_BUSINESS_MONTHLY'] },
  {
    plan: 'Business',
    interval: 'year',
    envNames: ['STRIPE_PRICE_BUSINESS_YEARLY', 'STRIPE_PRICE_BUSINESS_ANNUAL'],
  },
];

/** Amount in cents the app displays for this plan and interval (seed / catalog). */
function expectedCents(slot: PriceSlot): number | null {
  const row = CATALOG_FALLBACK_ROWS.find((r) => r.name === slot.plan);
  if (!row) return null;
  const amount = Number(slot.interval === 'month' ? row.priceMonthly : row.priceYearly);
  return Math.round(amount * 100);
}

function euros(cents: number | null | undefined): string {
  return cents == null ? '?' : `${(cents / 100).toFixed(2)} €`;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** Static checks on the environment, before any Stripe call. */
export function checkStripeEnv(env: Env): CheckResult[] {
  const results: CheckResult[] = [];
  const key = env.STRIPE_SECRET_KEY;

  if (!isNonPlaceholderSecret(key)) {
    results.push({ level: 'error', message: 'STRIPE_SECRET_KEY is missing or a placeholder.' });
  } else if (isStripeLiveSecret(key)) {
    const allowed = ['1', 'true', 'on'].includes(env.STRIPE_ALLOW_LIVE?.trim().toLowerCase() ?? '');
    results.push(
      allowed
        ? { level: 'warn', message: 'STRIPE_SECRET_KEY is a LIVE key: real cards will be charged.' }
        : {
            level: 'error',
            message:
              'STRIPE_SECRET_KEY is a live key but STRIPE_ALLOW_LIVE is not set: checkout is blocked.',
          }
    );
  } else {
    results.push({ level: 'ok', message: 'STRIPE_SECRET_KEY is a test key.' });
  }

  const webhook = env.STRIPE_WEBHOOK_SECRET;
  if (!isNonPlaceholderSecret(webhook)) {
    results.push({
      level: 'error',
      message:
        'STRIPE_WEBHOOK_SECRET is missing or a placeholder: payments would never activate a plan.',
    });
  } else if (!webhook.startsWith('whsec_')) {
    results.push({ level: 'error', message: 'STRIPE_WEBHOOK_SECRET must start with whsec_.' });
  } else {
    results.push({ level: 'ok', message: 'STRIPE_WEBHOOK_SECRET is set.' });
  }

  const connect = env.STRIPE_CONNECT_WEBHOOK_SECRET;
  if (!isNonPlaceholderSecret(connect)) {
    results.push({
      level: 'warn',
      message:
        'STRIPE_CONNECT_WEBHOOK_SECRET is not set: fine locally (stripe listen), required in staging/production for marketplace sellers (account.updated).',
    });
  } else if (!connect.startsWith('whsec_')) {
    results.push({
      level: 'error',
      message: 'STRIPE_CONNECT_WEBHOOK_SECRET must start with whsec_.',
    });
  } else {
    results.push({ level: 'ok', message: 'STRIPE_CONNECT_WEBHOOK_SECRET is set.' });
  }

  const failClosed = env.STRIPE_FAIL_CLOSED?.trim().toLowerCase();
  if (failClosed === '0' || failClosed === 'false' || failClosed === 'off') {
    results.push({ level: 'warn', message: 'STRIPE_FAIL_CLOSED is disabled.' });
  }

  return results;
}

async function checkPrice(stripe: Stripe, env: Env, slot: PriceSlot): Promise<CheckResult[]> {
  const label = `${slot.plan} ${slot.interval === 'month' ? 'monthly' : 'yearly'}`;
  const envName = slot.envNames.find((name) => isNonPlaceholderSecret(env[name]));
  if (!envName) {
    return [
      {
        level: 'error',
        message: `${label}: ${slot.envNames[0]} is not set (checkout returns STRIPE_PRICE_NOT_CONFIGURED).`,
      },
    ];
  }

  const priceId = env[envName]!.trim();
  let price: Stripe.Price;
  try {
    price = await stripe.prices.retrieve(priceId);
  } catch (error) {
    return [
      {
        level: 'error',
        message: `${label}: ${envName}=${priceId} not found (${errorMessage(error)}).`,
      },
    ];
  }

  const problems: string[] = [];
  if (!price.active) problems.push('the price is archived');
  if (price.type !== 'recurring' || !price.recurring) {
    problems.push('the price is not recurring');
  } else {
    if (price.recurring.interval !== slot.interval || price.recurring.interval_count !== 1) {
      problems.push(
        `billed every ${price.recurring.interval_count} ${price.recurring.interval}, expected every 1 ${slot.interval}`
      );
    }
  }
  if (price.currency !== 'eur')
    problems.push(`currency ${price.currency.toUpperCase()}, expected EUR`);
  const expected = expectedCents(slot);
  if (expected !== null && price.unit_amount !== expected) {
    problems.push(`amount ${euros(price.unit_amount)}, the app displays ${euros(expected)}`);
  }

  const results: CheckResult[] = problems.length
    ? [{ level: 'error', message: `${label} (${priceId}): ${problems.join('; ')}.` }]
    : [
        {
          level: 'ok',
          message: `${label} (${priceId}): ${euros(price.unit_amount)} / ${slot.interval}.`,
        },
      ];

  if (price.recurring?.trial_period_days) {
    results.push({
      level: 'warn',
      message: `${label}: the price has its own ${price.recurring.trial_period_days}-day trial; the app already adds the trial at checkout.`,
    });
  }
  return results;
}

async function checkWebhookEndpoints(stripe: Stripe): Promise<CheckResult[]> {
  let endpoints: Stripe.WebhookEndpoint[];
  try {
    endpoints = (await stripe.webhookEndpoints.list({ limit: 100 })).data;
  } catch (error) {
    return [
      { level: 'warn', message: `Could not list webhook endpoints (${errorMessage(error)}).` },
    ];
  }

  const ours = endpoints.filter((e) => e.status === 'enabled' && e.url.endsWith(WEBHOOK_PATH));
  if (ours.length === 0) {
    return [
      {
        level: 'warn',
        message: `No enabled webhook endpoint ending in ${WEBHOOK_PATH}: fine locally with "stripe listen", required in staging/production.`,
      },
    ];
  }

  return ours.map((endpoint) => {
    const events = new Set(endpoint.enabled_events);
    const missing = events.has('*')
      ? []
      : ACCOUNT_WEBHOOK_EVENTS.filter((event) => !events.has(event));
    return missing.length
      ? {
          level: 'error' as const,
          message: `Webhook ${endpoint.url} is missing events: ${missing.join(', ')}.`,
        }
      : { level: 'ok' as const, message: `Webhook ${endpoint.url} listens to every needed event.` };
  });
}

async function checkBillingPortal(stripe: Stripe): Promise<CheckResult> {
  try {
    const configs = await stripe.billingPortal.configurations.list({ is_default: true, limit: 1 });
    const config = configs.data[0];
    if (config?.active) {
      return { level: 'ok', message: 'Customer portal is activated.' };
    }
  } catch (error) {
    return {
      level: 'warn',
      message: `Could not read the customer portal settings (${errorMessage(error)}).`,
    };
  }
  return {
    level: 'warn',
    message:
      'Customer portal is not activated: "Gérer mon paiement" will fail. Dashboard → Settings → Billing → Customer portal.',
  };
}

/** Full check: environment, then the Stripe account, prices, webhooks and customer portal. */
export async function checkStripeConfig(env: Env, stripe: Stripe | null): Promise<CheckResult[]> {
  const results = checkStripeEnv(env);
  if (!stripe) return results;

  try {
    const account = await stripe.accounts.retrieveCurrent();
    results.push({
      level: 'ok',
      message: `Stripe account ${account.id} (${account.country ?? '?'}) reachable.`,
    });
  } catch (error) {
    const rejected = (error as { type?: string } | null)?.type === 'StripeAuthenticationError';
    results.push({
      level: 'error',
      message: rejected
        ? `Stripe rejected STRIPE_SECRET_KEY (${errorMessage(error)}).`
        : `Could not reach the Stripe API: check the network or proxy (${errorMessage(error)}).`,
    });
    return results;
  }

  for (const slot of PRICE_SLOTS) {
    results.push(...(await checkPrice(stripe, env, slot)));
  }
  results.push(...(await checkWebhookEndpoints(stripe)));
  results.push(await checkBillingPortal(stripe));
  return results;
}

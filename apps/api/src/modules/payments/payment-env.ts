export function isNonPlaceholderSecret(value?: string | null): value is string {
  if (!value) return false;
  const v = value.trim();
  if (!v) return false;
  const lower = v.toLowerCase();
  if (lower.includes('xxx')) return false;
  if (lower.includes('placeholder')) return false;
  if (lower === 'missing') return false;
  if (v.includes('your_api_key')) return false;
  return true;
}

export function isStripeLiveSecret(value?: string | null): boolean {
  const v = (value ?? '').trim();
  return v.startsWith('sk_live_') || v.startsWith('rk_live_');
}

export function isStripeLiveAllowed() {
  const raw = process.env.STRIPE_ALLOW_LIVE?.trim().toLowerCase();
  return raw === '1' || raw === 'true' || raw === 'on';
}

/** Secret usable by the Stripe SDK (not placeholder, and not live unless allowed). */
export function stripeSecretForClient(): string | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!isNonPlaceholderSecret(key)) return null;
  if (isStripeLiveSecret(key) && !isStripeLiveAllowed()) return null;
  return key;
}

/**
 * Signing secrets of the webhook endpoints that post to POST /payments/webhook.
 * Stripe signs "your account" events and "connected accounts" (Connect, e.g. account.updated)
 * events from two separate endpoints, each with its own secret.
 */
export function stripeWebhookSecrets(): string[] {
  return [process.env.STRIPE_WEBHOOK_SECRET, process.env.STRIPE_CONNECT_WEBHOOK_SECRET].filter(
    isNonPlaceholderSecret
  );
}

export function isStripeConfiguredFromEnv() {
  return isNonPlaceholderSecret(process.env.STRIPE_SECRET_KEY);
}

/** Fail-closed unless explicitly disabled (`0` / `false` / `off`). */
export function isStripeFailClosed() {
  const raw = process.env.STRIPE_FAIL_CLOSED?.trim().toLowerCase();
  if (raw === 'false' || raw === '0' || raw === 'off') return false;
  return true;
}

/** Payment providers configured in this environment (exposed by the health check). */
export function availablePaymentMethods() {
  return { stripe: Boolean(stripeSecretForClient()) };
}

/** Stripe expandable field → id (`cus_…` / `sub_…`). */
export function expandableStripeId(
  value: string | { id: string } | null | undefined
): string | undefined {
  if (!value) return undefined;
  return typeof value === 'string' ? value : value.id;
}

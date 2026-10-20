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

export function isPaystackLiveSecret(value?: string | null): boolean {
  return (value ?? '').trim().startsWith('sk_live_');
}

export function isPaystackLiveAllowed() {
  const raw = process.env.PAYSTACK_ALLOW_LIVE?.trim().toLowerCase();
  return raw === '1' || raw === 'true' || raw === 'on';
}

/** Secret usable against the Paystack API (not placeholder, and not live unless allowed). */
export function paystackSecretForClient(): string | null {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!isNonPlaceholderSecret(key)) return null;
  if (isPaystackLiveSecret(key) && !isPaystackLiveAllowed()) return null;
  return key.trim();
}

export function isPaystackConfiguredFromEnv() {
  return isNonPlaceholderSecret(process.env.PAYSTACK_SECRET_KEY);
}

/** Fail-closed unless explicitly disabled (`0` / `false` / `off`). */
export function isPaymentFailClosed() {
  const raw = process.env.PAYMENT_FAIL_CLOSED?.trim().toLowerCase();
  if (raw === 'false' || raw === '0' || raw === 'off') return false;
  return true;
}

/**
 * Currency every payment is charged in (ISO 4217, upper case). Paystack settles a Côte d'Ivoire
 * account in XOF; another currency needs the matching capability on the Paystack account.
 */
export function paymentCurrency(): string {
  const raw = process.env.PAYMENT_CURRENCY?.trim().toUpperCase();
  return raw && /^[A-Z]{3}$/.test(raw) ? raw : 'XOF';
}

/** Payment providers configured in this environment (exposed by the health check). */
export function availablePaymentMethods() {
  return { paystack: Boolean(paystackSecretForClient()) };
}

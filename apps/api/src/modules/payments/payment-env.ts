export function isNonPlaceholderSecret(value?: string | null): value is string {
  if (!value) return false;
  const v = value.trim();
  if (!v) return false;
  if (v.includes('xxx')) return false;
  if (v.includes('your_api_key') || v.includes('your_site_id')) return false;
  return true;
}

export function isCinetpayConfiguredFromEnv() {
  return (
    isNonPlaceholderSecret(process.env.CINETPAY_API_KEY) &&
    isNonPlaceholderSecret(process.env.CINETPAY_SITE_ID)
  );
}

export function isStripeConfiguredFromEnv() {
  return isNonPlaceholderSecret(process.env.STRIPE_SECRET_KEY);
}

/** Default true in production. Explicit false/0/off disables fail-closed. */
export function isCinetpayFailClosed() {
  const raw = process.env.CINETPAY_FAIL_CLOSED?.trim().toLowerCase();
  if (raw === 'false' || raw === '0' || raw === 'off') return false;
  if (raw === 'true' || raw === '1' || raw === 'on') return true;
  return process.env.NODE_ENV === 'production';
}

export function availablePaymentMethods() {
  return {
    stripe: isStripeConfiguredFromEnv(),
    cinetpay: isCinetpayConfiguredFromEnv(),
    cinetpayFailClosed: isCinetpayFailClosed(),
  };
}

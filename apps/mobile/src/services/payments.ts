import { useStripe } from '@stripe/stripe-react-native';
import { billingApi } from '../api';

/**
 * Opens Stripe Payment Sheet with Apple Pay / Google Pay wallets when available.
 * Legal ADR required before Store GA (IAP vs Stripe wallets).
 */
export function useNativeCheckout() {
  const { initPaymentSheet, presentPaymentSheet } = useStripe();

  async function startProCheckout(): Promise<{ ok: boolean; error?: string }> {
    const sheet = await billingApi.paymentSheet();
    const { error: initError } = await initPaymentSheet({
      merchantDisplayName: 'CV Studio AI',
      customerId: sheet.customerId,
      customerEphemeralKeySecret: sheet.ephemeralKey,
      paymentIntentClientSecret: sheet.paymentIntentClientSecret,
      applePay: { merchantCountryCode: 'US' },
      googlePay: { merchantCountryCode: 'US', testEnv: true },
      allowsDelayedPaymentMethods: false,
    });
    if (initError) return { ok: false, error: initError.message };

    const { error: presentError } = await presentPaymentSheet();
    if (presentError) return { ok: false, error: presentError.message };
    return { ok: true };
  }

  return { startProCheckout };
}

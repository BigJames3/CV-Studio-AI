import { useEffect, useRef } from 'react';
import { AppState, Linking } from 'react-native';
import { billingApi, type BillingInterval } from '../api';

/**
 * Paystack checkout (Android only: App Store rule 3.1.1 forbids selling the plan through an
 * external payment in the iOS app). The payment page opens in the browser; when the app comes
 * back to the foreground, the reference is sent to /payments/checkout/confirm, which verifies
 * the transaction with Paystack. Paystack itself returns the browser to the web billing page.
 */
export function useNativeCheckout(onReturn: (result: { confirmed: boolean }) => void) {
  const pendingReference = useRef<string | null>(null);
  const onReturnRef = useRef(onReturn);
  onReturnRef.current = onReturn;

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active' && pendingReference.current) {
        void confirmPending().then((result) => {
          if (result) onReturnRef.current(result);
        });
      }
    });
    return () => sub.remove();
  }, []);

  /** Confirms the payment opened last; null when none is pending. */
  async function confirmPending(): Promise<{ confirmed: boolean } | null> {
    const reference = pendingReference.current;
    if (!reference) return null;
    try {
      const result = await billingApi.confirmCheckout(reference);
      if (result.confirmed) pendingReference.current = null;
      return result;
    } catch {
      // Not paid yet, or Paystack unreachable: the webhook still applies a completed payment.
      return { confirmed: false };
    }
  }

  async function startCheckout(
    plan: 'pro' | 'business',
    interval: BillingInterval
  ): Promise<{ ok: boolean; error?: string }> {
    try {
      const { url, reference } = await billingApi.checkout(plan, interval);
      pendingReference.current = reference;
      await Linking.openURL(url);
      return { ok: true };
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : 'Impossible d’ouvrir la page de paiement.',
      };
    }
  }

  return { startCheckout, confirmPending, hasPending: () => pendingReference.current !== null };
}

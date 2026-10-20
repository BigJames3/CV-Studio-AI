import { ApiError } from '@/lib/api/client';

/**
 * User-facing message when starting a checkout fails. The request fails before the provider
 * page opens, so nothing was charged: "payment failed, try another card" was misleading.
 */
export function checkoutErrorMessage(error: unknown): string {
  // fetch() rejects with a TypeError when the API cannot be reached at all.
  if (!(error instanceof ApiError)) {
    return 'Impossible de joindre le serveur. Vérifiez votre connexion ou réessayez dans un instant.';
  }

  switch (error.code) {
    case 'PAYMENTS_NOT_CONFIGURED':
    case 'PRICE_NOT_CONFIGURED':
    case 'PAYSTACK_LIVE_KEY_BLOCKED':
      return 'Le paiement n’est pas disponible pour le moment. Réessayez plus tard ou contactez le support.';
    case 'PAYMENT_PROVIDER_UNAVAILABLE':
      return 'Le service de paiement est momentanément indisponible. Réessayez dans un instant.';
    case 'PLAN_NOT_FOUND':
      return 'Ce plan n’est pas disponible pour le moment.';
    case 'VALIDATION_ERROR':
      return 'La demande de paiement est invalide. Rechargez la page et réessayez.';
  }

  if (error.code === 'RATE_LIMITED' || error.status === 429) {
    return 'Trop de tentatives. Réessayez dans quelques minutes.';
  }
  if (error.status === 401) {
    return 'Votre session a expiré. Reconnectez-vous puis réessayez.';
  }
  if (error.status >= 500) {
    return 'Le service de paiement est momentanément indisponible. Réessayez dans un instant.';
  }
  return 'Impossible de démarrer le paiement. Réessayez dans un instant.';
}

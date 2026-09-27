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
    case 'STRIPE_NOT_CONFIGURED':
    case 'STRIPE_PRICE_NOT_CONFIGURED':
    case 'STRIPE_LIVE_KEY_BLOCKED':
      return 'Le paiement par carte n’est pas disponible pour le moment. Réessayez plus tard ou contactez le support.';
    case 'ALREADY_SUBSCRIBED':
      return 'Vous êtes déjà abonné à ce plan.';
    case 'SUBSCRIPTION_PAYMENT_ISSUE':
      return 'Une facture de votre abonnement est impayée. Mettez à jour votre moyen de paiement avant de changer de plan.';
    case 'STRIPE_UNAVAILABLE':
      return 'Impossible de vérifier votre abonnement actuel. Réessayez dans un instant.';
    case 'STRIPE_SUBSCRIPTION_INVALID':
      return 'Votre abonnement actuel ne peut pas être modifié. Contactez le support.';
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

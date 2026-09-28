import { ApiError } from '@/lib/api/client';

export type AuthAction = 'login' | 'register' | 'totp';

/**
 * User-facing message for a failed login, registration or 2FA step.
 * A single generic message hid the cause (API down, rate limit, locked account, bad password).
 */
export function authErrorMessage(error: unknown, action: AuthAction): string {
  // fetch() rejects with a TypeError when the API cannot be reached at all.
  if (!(error instanceof ApiError)) {
    return 'Impossible de joindre le serveur. Vérifiez votre connexion ou réessayez dans un instant.';
  }

  if (error.status >= 500) {
    return 'Le service est momentanément indisponible. Réessayez dans un instant.';
  }

  if (error.code === 'RATE_LIMITED' || error.status === 429) {
    return action === 'register'
      ? 'Trop d’inscriptions depuis cette connexion. Réessayez dans une heure.'
      : 'Trop de tentatives. Réessayez dans quelques minutes.';
  }

  switch (error.code) {
    case 'ACCOUNT_LOCKED':
      return 'Compte temporairement verrouillé après plusieurs échecs. Réessayez dans quelques minutes ou réinitialisez votre mot de passe.';
    case 'EMAIL_NOT_VERIFIED':
      return 'Confirmez votre adresse email avant de vous connecter.';
    case 'EMAIL_TAKEN':
      return 'Cet email est déjà utilisé. Connectez-vous ou réinitialisez votre mot de passe.';
    case 'VALIDATION_ERROR':
      return 'Certains champs sont invalides. Vérifiez-les et réessayez.';
  }

  if (error.status === 409 && action === 'register') {
    return 'Cet email est déjà utilisé. Connectez-vous ou réinitialisez votre mot de passe.';
  }

  if (error.status === 401) {
    return action === 'totp'
      ? 'Code invalide ou session expirée.'
      : 'Email ou mot de passe incorrect.';
  }

  return action === 'register'
    ? 'Impossible de créer le compte. Vérifiez les champs et réessayez.'
    : 'Connexion impossible. Réessayez.';
}

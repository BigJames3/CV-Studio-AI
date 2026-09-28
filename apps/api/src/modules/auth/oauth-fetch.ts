import { ServiceUnavailableException } from '@nestjs/common';

/** Longest a sign-in waits on LinkedIn or Google before telling the user to retry. */
export const OAUTH_TIMEOUT_MS = 10_000;

/**
 * fetch() for OAuth providers: capped at OAUTH_TIMEOUT_MS, and a provider that is down or
 * silent becomes a 503 OAUTH_UNAVAILABLE instead of an unhandled 500 (or a request that hangs
 * until undici gives up).
 */
export async function oauthFetch(
  provider: 'LinkedIn' | 'Google',
  url: string,
  init: RequestInit = {}
): Promise<Response> {
  try {
    return await fetch(url, { ...init, signal: AbortSignal.timeout(OAUTH_TIMEOUT_MS) });
  } catch {
    throw new ServiceUnavailableException({
      code: 'OAUTH_UNAVAILABLE',
      message: `${provider} sign-in is not responding, please try again`,
    });
  }
}

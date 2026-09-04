import type { Response, CookieOptions } from 'express';
import { getRefreshTtlSeconds } from './auth-secrets';

export const REFRESH_COOKIE = 'refresh_token';
/** Non-sensitive presence flag so Next middleware can gate routes (HttpOnly refresh is also readable by Next on same host). */
export const SESSION_FLAG_COOKIE = 'cv_session';

/** Secure cookies are dropped on http:// (Docker NODE_ENV=production). Honor COOKIE_SECURE, else HTTPS APP_URL. */
export function useSecureCookies(): boolean {
  const flag = process.env.COOKIE_SECURE?.toLowerCase();
  if (flag === 'true' || flag === '1') return true;
  if (flag === 'false' || flag === '0') return false;
  const publicUrl = process.env.APP_URL || process.env.API_URL || '';
  if (publicUrl.startsWith('http://')) return false;
  return process.env.NODE_ENV === 'production';
}

export function refreshCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: useSecureCookies(),
    sameSite: 'lax',
    path: '/',
    maxAge: getRefreshTtlSeconds() * 1000,
  };
}

export function sessionFlagCookieOptions(): CookieOptions {
  return {
    httpOnly: false,
    secure: useSecureCookies(),
    sameSite: 'lax',
    path: '/',
    maxAge: getRefreshTtlSeconds() * 1000,
  };
}

export function setAuthCookies(res: Response, refreshToken: string) {
  res.cookie(REFRESH_COOKIE, refreshToken, refreshCookieOptions());
  res.cookie(SESSION_FLAG_COOKIE, '1', sessionFlagCookieOptions());
}

/**
 * Clear auth cookies with the SAME attributes used at set-time.
 * Browsers ignore clearCookie when sameSite/secure/path diverge from the stored cookie.
 */
export function clearAuthCookies(res: Response) {
  const refresh = refreshCookieOptions();
  const flag = sessionFlagCookieOptions();

  const refreshClear: CookieOptions = {
    httpOnly: refresh.httpOnly,
    secure: refresh.secure,
    sameSite: refresh.sameSite,
    path: refresh.path ?? '/',
  };
  const flagClear: CookieOptions = {
    httpOnly: flag.httpOnly,
    secure: flag.secure,
    sameSite: flag.sameSite,
    path: flag.path ?? '/',
  };

  res.clearCookie(REFRESH_COOKIE, refreshClear);
  res.clearCookie(SESSION_FLAG_COOKIE, flagClear);

  res.cookie(REFRESH_COOKIE, '', { ...refreshClear, maxAge: 0 });
  res.cookie(SESSION_FLAG_COOKIE, '', { ...flagClear, maxAge: 0 });
}

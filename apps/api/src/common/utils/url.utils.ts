import { Logger } from '@nestjs/common';

const logger = new Logger('UrlUtils');

const BILLING_PATH = '/account/billing';

export function appOriginFromEnv(): string {
  return (
    process.env.APP_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    'http://localhost:3000'
  ).replace(/\/$/, '');
}

/**
 * Allowlist return URLs for payment checkout redirects.
 * Only same-origin `/account/billing` paths are accepted; anything else falls back.
 */
export function safeReturnUrl(
  input: string | undefined,
  fallback: string,
  allowedOrigin?: string
): string {
  const appOrigin = (allowedOrigin ?? appOriginFromEnv()).replace(/\/$/, '');

  if (!input || !input.trim()) return fallback;

  try {
    const url = new URL(input);
    const appUrl = new URL(appOrigin);

    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      logger.warn(`Blocked redirect with protocol ${url.protocol}`);
      return fallback;
    }

    if (url.username || url.password) {
      logger.warn('Blocked redirect with embedded credentials');
      return fallback;
    }

    if (url.origin !== appUrl.origin) {
      logger.warn(`Blocked redirect to ${url.origin}`);
      return fallback;
    }

    const path = url.pathname.replace(/\/+$/, '') || '/';
    if (path !== BILLING_PATH) {
      logger.warn(`Blocked redirect to ${url.pathname}`);
      return fallback;
    }

    return url.toString();
  } catch {
    logger.warn(`Invalid URL in safeReturnUrl: ${input}`);
    return fallback;
  }
}

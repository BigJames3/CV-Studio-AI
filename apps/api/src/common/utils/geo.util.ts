import type { Request } from 'express';

export {
  AFRICAN_MOBILE_PAYMENT_ZONES,
  CEMAC_COUNTRIES,
  WAEMU_COUNTRIES,
  isCinetpayCountry,
  planCountryDetection,
  suggestPaymentMethod,
} from '@cvstudio/shared-utils';

const GEO_HEADER_KEYS = ['cf-ipcountry', 'x-country', 'x-geo-country'] as const;
const UNKNOWN_COUNTRY_CODES = new Set(['XX', 'T1']);

function firstHeaderValue(headers: Request['headers'], name: string): string | null {
  const raw = headers[name];
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (typeof value !== 'string') return null;
  const code = value.trim().toUpperCase();
  if (!code || UNKNOWN_COUNTRY_CODES.has(code)) return null;
  if (!/^[A-Z]{2}$/.test(code)) return null;
  return code;
}

/**
 * Country from reverse-proxy geo headers (Cloudflare, custom ingress).
 * Does not read or store the client IP.
 */
export function getCountryFromHeaders(req: Pick<Request, 'headers'>): string | null {
  for (const key of GEO_HEADER_KEYS) {
    const country = firstHeaderValue(req.headers, key);
    if (country) return country;
  }
  return null;
}

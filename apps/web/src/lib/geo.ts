/**
 * Geolocation detection with a privacy-first approach.
 * Profile country always wins. IP lookup requires explicit consent and no DNT.
 */

import {
  isCinetpayCountry,
  planCountryDetection,
  suggestPaymentMethod,
  type GeoLocationSource,
  type PaymentProvider,
} from '@cvstudio/shared-utils';
import { apiClient } from '@/lib/api/client';

export { isCinetpayCountry, suggestPaymentMethod };
export type { GeoLocationSource, PaymentProvider };

export const GEO_CONSENT_KEY = 'cv_studio_geo_consent';
export const PAYMENT_METHOD_KEY = 'cv_studio_payment_method';
export const GEO_CONSENT_CHANGED_EVENT = 'cv-studio-geo-consent-changed';

export interface GeoLocation {
  countryCode: string | null;
  source: GeoLocationSource;
  consentGiven: boolean;
}

export function getGeoConsent(): boolean | null {
  if (typeof window === 'undefined') return null;
  const stored = window.localStorage.getItem(GEO_CONSENT_KEY);
  if (stored === 'true') return true;
  if (stored === 'false') return false;
  return null;
}

export function hasGeoConsent(): boolean {
  return getGeoConsent() === true;
}

export function setGeoConsent(consent: boolean): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(GEO_CONSENT_KEY, String(consent));
  window.dispatchEvent(new Event(GEO_CONSENT_CHANGED_EVENT));
}

export function hasDoNotTrackEnabled(): boolean {
  if (typeof navigator === 'undefined') return false;
  const nav = navigator as Navigator & { msDoNotTrack?: string };
  const win =
    typeof window === 'undefined' ? undefined : (window as Window & { doNotTrack?: string });
  return (
    nav.doNotTrack === '1' ||
    nav.doNotTrack === 'yes' ||
    nav.msDoNotTrack === '1' ||
    win?.doNotTrack === '1'
  );
}

export function readSavedPaymentMethod(): PaymentProvider | null {
  if (typeof window === 'undefined') return null;
  const saved = window.localStorage.getItem(PAYMENT_METHOD_KEY);
  return saved === 'stripe' || saved === 'cinetpay' ? saved : null;
}

export function persistPaymentMethod(method: PaymentProvider): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(PAYMENT_METHOD_KEY, method);
}

export async function detectCountry(userCountryCode?: string | null): Promise<GeoLocation> {
  const doNotTrack = hasDoNotTrackEnabled();
  const consent = getGeoConsent();
  const plan = planCountryDetection({
    userCountryCode,
    doNotTrack,
    consent,
  });

  if (plan.action === 'profile') {
    return {
      countryCode: plan.countryCode,
      source: 'user-profile',
      consentGiven: true,
    };
  }

  if (plan.action === 'skip' || typeof window === 'undefined') {
    return {
      countryCode: null,
      source: 'unknown',
      consentGiven: consent === true && !doNotTrack,
    };
  }

  try {
    const result = await apiClient<{ country: string | null; source: 'ip' | 'unknown' }>(
      '/geo/country'
    );
    return {
      countryCode: result.country,
      source: result.country ? 'browser-ip' : 'unknown',
      consentGiven: true,
    };
  } catch {
    return {
      countryCode: null,
      source: 'unknown',
      consentGiven: true,
    };
  }
}

'use client';

/**
 * The visitor's choice for non-essential trackers. Only one category exists today:
 * audience measurement (PostHog). Strictly necessary storage (session, logout sync,
 * editor draft) never depends on it.
 */
export const CONSENT_KEY = 'cv_analytics_consent';
/** When the choice was made: minimal proof, and lets the choice expire. */
export const CONSENT_AT_KEY = 'cv_analytics_consent_at';
/** A choice is asked again after 13 months. */
export const CONSENT_MAX_AGE_MS = 395 * 24 * 60 * 60 * 1000;
/** Fired to reopen the preferences (footer link, settings). */
export const OPEN_PREFERENCES_EVENT = 'cv:open-cookie-preferences';

export type ConsentChoice = 'granted' | 'denied';

function storage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}

/** The stored choice, or null when none was made or it expired. */
export function readConsent(now = Date.now()): ConsentChoice | null {
  const store = storage();
  const value = store?.getItem(CONSENT_KEY);
  if (value !== 'granted' && value !== 'denied') return null;
  const at = Date.parse(store?.getItem(CONSENT_AT_KEY) ?? '');
  // Choices stored before the date was recorded are asked again.
  if (!Number.isFinite(at) || now - at > CONSENT_MAX_AGE_MS) return null;
  return value;
}

export function writeConsent(choice: ConsentChoice): void {
  const store = storage();
  if (!store) return;
  try {
    store.setItem(CONSENT_KEY, choice);
    store.setItem(CONSENT_AT_KEY, new Date().toISOString());
  } catch {
    // Storage disabled: the choice holds for this page only.
  }
}

export function openCookiePreferences(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(OPEN_PREFERENCES_EVENT));
}

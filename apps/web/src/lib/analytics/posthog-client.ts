'use client';

import posthog from 'posthog-js';
import { readConsent, writeConsent } from './consent';

let initialized = false;

function projectKey(): string | undefined {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key || !key.startsWith('phc_')) return undefined;
  return key;
}

function apiHost(): string {
  return process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com';
}

/** Dev captures by default so local validation works. Prod requires consent. */
export function shouldAutoEnable(): boolean {
  if (typeof window === 'undefined') return false;
  if (process.env.NEXT_PUBLIC_POSTHOG_OPT_OUT === 'true') return false;
  const consent = readConsent();
  if (consent) return consent === 'granted';
  return process.env.NODE_ENV === 'development';
}

export function hasStoredConsent(): boolean {
  return readConsent() === 'granted';
}

export function isPostHogConfigured(): boolean {
  return Boolean(projectKey());
}

/**
 * Loads PostHog. Only called once capture is allowed: PostHog writes its own cookie and
 * localStorage entry as soon as it starts, even when capture is opted out.
 */
export function initPostHog(): void {
  if (typeof window === 'undefined' || initialized) return;
  if (!shouldAutoEnable()) return;
  const key = projectKey();
  if (!key) return;

  initialized = true;
  posthog.init(key, {
    api_host: apiHost(),
    person_profiles: 'identified_only',
    capture_pageview: false,
    capture_pageleave: true,
    persistence: 'localStorage+cookie',
    opt_out_capturing_by_default: true,
    loaded: (ph) => {
      if (shouldAutoEnable()) {
        ph.opt_in_capturing();
      }
    },
  });
}

export function optInPostHog(): void {
  if (typeof window === 'undefined') return;
  writeConsent('granted');
  if (!initialized) initPostHog();
  if (initialized) posthog.opt_in_capturing();
}

/** Removes what PostHog stored in this browser (cookie `ph_*`, localStorage `ph_*`). */
function clearPostHogStorage(): void {
  try {
    for (const key of Object.keys(window.localStorage)) {
      if (key.startsWith('ph_') || key.startsWith('__ph_')) window.localStorage.removeItem(key);
    }
  } catch {
    // Storage disabled: nothing was stored.
  }
  for (const cookie of document.cookie.split(';')) {
    const name = cookie.split('=')[0]?.trim();
    if (name && (name.startsWith('ph_') || name.startsWith('__ph_'))) {
      document.cookie = `${name}=; Max-Age=0; path=/`;
      document.cookie = `${name}=; Max-Age=0; path=/; domain=.${window.location.hostname}`;
    }
  }
}

export function optOutPostHog(): void {
  if (typeof window === 'undefined') return;
  writeConsent('denied');
  if (initialized) {
    posthog.opt_out_capturing();
    posthog.reset();
  }
  clearPostHogStorage();
}

export function identifyPostHog(
  userId: string,
  traits?: Record<string, string | number | boolean | null | undefined>
): void {
  if (!initialized) return;
  posthog.identify(userId, traits);
}

export function capturePostHog(
  event: string,
  properties?: Record<string, string | number | boolean | null | undefined>
): void {
  if (!initialized) return;
  posthog.capture(event, properties);
}

export function resetPostHog(): void {
  if (!initialized) return;
  posthog.reset();
}

export { posthog };

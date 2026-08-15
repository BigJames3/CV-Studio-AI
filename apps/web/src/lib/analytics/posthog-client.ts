'use client';

import posthog from 'posthog-js';

const CONSENT_KEY = 'cv_analytics_consent';

let initialized = false;

function projectKey(): string | undefined {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key || !key.startsWith('phc_')) return undefined;
  return key;
}

function apiHost(): string {
  return process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com';
}

/** Dev captures by default so local validation works. Prod requires consent. */
export function shouldAutoEnable(): boolean {
  if (typeof window === 'undefined') return false;
  if (process.env.NEXT_PUBLIC_POSTHOG_OPT_OUT === 'true') return false;
  if (window.localStorage.getItem(CONSENT_KEY) === 'granted') return true;
  if (window.localStorage.getItem(CONSENT_KEY) === 'denied') return false;
  return process.env.NODE_ENV === 'development';
}

export function hasStoredConsent(): boolean {
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem(CONSENT_KEY) === 'granted';
}

export function isPostHogConfigured(): boolean {
  return Boolean(projectKey());
}

export function initPostHog(): void {
  if (typeof window === 'undefined' || initialized) return;
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
  window.localStorage.setItem(CONSENT_KEY, 'granted');
  if (!initialized) initPostHog();
  if (initialized) posthog.opt_in_capturing();
}

export function optOutPostHog(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(CONSENT_KEY, 'denied');
  if (initialized) {
    posthog.opt_out_capturing();
    posthog.reset();
  }
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

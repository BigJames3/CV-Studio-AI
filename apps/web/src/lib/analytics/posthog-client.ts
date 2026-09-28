'use client';

import type { PostHog } from 'posthog-js';

const CONSENT_KEY = 'cv_analytics_consent';

let initialized = false;
let client: PostHog | null = null;
// posthog-js (~80 KB) is loaded on demand, after hydration, so it never delays the first render.
let loading: Promise<PostHog | null> | null = null;

function projectKey(): string | undefined {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key || !key.startsWith('phc_')) return undefined;
  return key;
}

function apiHost(): string {
  return process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com';
}

/** Runs now once PostHog is loaded, or when it finishes loading (calls keep their order). */
function withClient(fn: (ph: PostHog) => void): void {
  if (client) {
    fn(client);
    return;
  }
  void loading?.then((ph) => {
    if (ph) fn(ph);
  });
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
  loading = import('posthog-js')
    .then(({ default: posthog }) => {
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
      client = posthog;
      return posthog;
    })
    .catch(() => null);
}

export function optInPostHog(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(CONSENT_KEY, 'granted');
  if (!initialized) initPostHog();
  if (initialized) withClient((ph) => ph.opt_in_capturing());
}

export function optOutPostHog(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(CONSENT_KEY, 'denied');
  if (initialized) {
    withClient((ph) => {
      ph.opt_out_capturing();
      ph.reset();
    });
  }
}

export function identifyPostHog(
  userId: string,
  traits?: Record<string, string | number | boolean | null | undefined>
): void {
  if (!initialized) return;
  withClient((ph) => ph.identify(userId, traits));
}

export function capturePostHog(
  event: string,
  properties?: Record<string, string | number | boolean | null | undefined>
): void {
  if (!initialized) return;
  withClient((ph) => ph.capture(event, properties));
}

export function resetPostHog(): void {
  if (!initialized) return;
  withClient((ph) => ph.reset());
}

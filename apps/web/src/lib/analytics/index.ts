'use client';

import { AnalyticsEvents, type AnalyticsEventName, type AnalyticsProps } from './events';
import {
  capturePostHog,
  identifyPostHog,
  initPostHog,
  optInPostHog,
  optOutPostHog,
  resetPostHog,
  shouldAutoEnable,
} from './posthog-client';

type IdentifyTraits = Record<string, string | number | boolean | null | undefined>;

let consented = false;
let sessionId = '';
let userId: string | null = null;

function ensureSession() {
  if (typeof window === 'undefined') return;
  if (!sessionId) {
    sessionId = sessionStorage.getItem('cv_sid') ?? crypto.randomUUID();
    sessionStorage.setItem('cv_sid', sessionId);
  }
}

function ensureReady() {
  if (consented) return;
  hydrateAnalyticsConsent();
}

function superProps(): AnalyticsProps {
  return {
    platform: 'web',
    env: process.env.NODE_ENV,
    session_id: sessionId || 'server',
    app_version: process.env.NEXT_PUBLIC_APP_VERSION ?? '0.1.0',
  };
}

/** Call after cookie consent accepted (or automatically in development). */
export function enableAnalytics() {
  consented = true;
  ensureSession();
  initPostHog();
  optInPostHog();
}

export function disableAnalytics() {
  consented = false;
  optOutPostHog();
}

export function resetAnalytics() {
  userId = null;
  resetPostHog();
}

export function identify(id: string, traits?: IdentifyTraits) {
  userId = id;
  ensureReady();
  if (!consented) return;
  identifyPostHog(id, traits);
  if (process.env.NODE_ENV === 'development') {
    console.debug('[analytics] identify', id, traits);
  }
}

export function track(event: AnalyticsEventName, properties: AnalyticsProps = {}) {
  if (!AnalyticsEvents.includes(event)) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[analytics] unknown event', event);
    }
    return;
  }
  ensureReady();
  ensureSession();
  if (!consented) return;

  const payload = {
    event,
    user_id: userId,
    timestamp: new Date().toISOString(),
    ...superProps(),
    properties,
  };

  capturePostHog(event, { ...superProps(), ...properties, user_id: userId });

  if (process.env.NODE_ENV === 'development') {
    console.debug('[analytics]', payload);
  }
}

export function page(path: string, props: AnalyticsProps = {}) {
  track('page_viewed', { path, ...props });
}

/** Restore session consent before the first paint of child effects. */
export function hydrateAnalyticsConsent(): boolean {
  initPostHog();
  if (shouldAutoEnable()) {
    consented = true;
    ensureSession();
    optInPostHog();
    return true;
  }
  return false;
}

export type { AnalyticsEventName, AnalyticsProps };
export { AnalyticsEvents } from './events';

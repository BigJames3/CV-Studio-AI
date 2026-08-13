import { AnalyticsEvents, type AnalyticsEventName, type AnalyticsProps } from './events';
import { captureEvent, identifyUser, initPostHog, logoutUser } from './posthog-client';

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

function superProps(): AnalyticsProps {
  return {
    platform: 'web',
    env: process.env.NODE_ENV,
    session_id: sessionId || 'server',
    app_version: process.env.NEXT_PUBLIC_APP_VERSION ?? '0.1.0',
  };
}

function hasPostHogKey() {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  return Boolean(key && !key.includes('xxx'));
}

/** Call after cookie consent accepted, or on app boot when PostHog is configured. */
export function enableAnalytics() {
  consented = true;
  ensureSession();
  initPostHog();
}

export function disableAnalytics() {
  consented = false;
}

export function identify(id: string, traits?: IdentifyTraits) {
  userId = id;
  if (!consented) return;
  identifyUser(id, traits);
  if (process.env.NODE_ENV === 'development') {
    console.debug('[analytics] identify', id, traits);
  }
}

export function reset() {
  userId = null;
  logoutUser();
}

export function track(event: AnalyticsEventName, properties: AnalyticsProps = {}) {
  if (!AnalyticsEvents.includes(event)) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[analytics] unknown event', event);
    }
    return;
  }
  ensureSession();
  if (!consented && !hasPostHogKey()) return;

  const payload = {
    ...superProps(),
    ...properties,
  };

  if (process.env.NODE_ENV === 'development') {
    console.debug('[analytics]', event, payload);
  }

  captureEvent(event, payload);
}

export function page(path: string, props: AnalyticsProps = {}) {
  track('page_viewed', { path, ...props });
}

export { captureEvent, identifyUser, logoutUser, initPostHog } from './posthog-client';

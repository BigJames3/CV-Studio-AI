import { AnalyticsEvents, type AnalyticsEventName, type AnalyticsProps } from './events';

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

/** Call after cookie consent accepted. */
export function enableAnalytics() {
  consented = true;
  ensureSession();
  // TODO: init Amplitude with NEXT_PUBLIC_AMPLITUDE_KEY
}

export function disableAnalytics() {
  consented = false;
}

export function identify(id: string, traits?: IdentifyTraits) {
  userId = id;
  if (!consented) return;
  // amplitude.setUserId(id); amplitude.identify(traits)
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
  ensureSession();
  if (!consented && event !== 'page_viewed') {
    // allow only anonymized page_viewed if cookieless mode later
  }
  if (!consented) return;

  const payload = {
    event,
    user_id: userId,
    timestamp: new Date().toISOString(),
    ...superProps(),
    properties,
  };

  if (process.env.NODE_ENV === 'development') {
    console.debug('[analytics]', payload);
  }
  // amplitude.track(event, { ...superProps(), ...properties })
}

export function page(path: string, props: AnalyticsProps = {}) {
  track('page_viewed', { path, ...props });
}

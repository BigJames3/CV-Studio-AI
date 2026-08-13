import posthog from 'posthog-js';

let initialized = false;

function getKey() {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key || key.includes('xxx')) return null;
  return key;
}

export function initPostHog() {
  if (typeof window === 'undefined') return null;
  const key = getKey();
  if (!key) return null;
  if (initialized) return posthog;

  posthog.init(key, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
    capture_pageview: false,
    autocapture: false,
    persistence: 'localStorage+cookie',
    loaded: (client) => {
      if (process.env.NODE_ENV === 'development') {
        client.opt_out_capturing();
      }
    },
  });

  initialized = true;
  return posthog;
}

export function captureEvent(event: string, properties?: Record<string, unknown>) {
  const client = initPostHog();
  if (!client) return;
  client.capture(event, properties);
}

export function identifyUser(userId: string, properties?: Record<string, unknown>) {
  const client = initPostHog();
  if (!client) return;
  client.identify(userId, properties);
}

export function logoutUser() {
  const client = initPostHog();
  if (!client) return;
  client.reset();
}

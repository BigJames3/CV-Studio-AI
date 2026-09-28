'use client';

/**
 * Browser Sentry, loaded after hydration instead of being bundled into every page's first-load
 * JavaScript (~90 KB gzip on the landing page's critical path). Errors thrown before it loads are
 * not captured; server and edge errors are still captured by sentry.server/edge.config.ts.
 */

type SentryModule = typeof import('@sentry/nextjs');

let loading: Promise<SentryModule | null> | null = null;

function ignoreWebVitalsNoise() {
  window.addEventListener('error', (event) => {
    const stack = event.error instanceof Error ? (event.error.stack ?? '') : '';
    if (event.message.includes("reading 'startTime'") && stack.includes('reportAllChanges')) {
      event.preventDefault();
    }
  });
}

export function loadSentry(): Promise<SentryModule | null> {
  if (typeof window === 'undefined') return Promise.resolve(null);
  if (loading) return loading;

  ignoreWebVitalsNoise();
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!dsn) {
    loading = Promise.resolve(null);
    return loading;
  }

  loading = import('@sentry/nextjs')
    .then((Sentry) => {
      Sentry.init({
        dsn,
        environment: process.env.NODE_ENV,
        tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 0,
        sendDefaultPii: false,
        integrations(integrations) {
          return integrations.filter((integration) => integration.name !== 'BrowserTracing');
        },
        beforeSend(event) {
          if (
            process.env.NODE_ENV === 'development' &&
            process.env.NEXT_PUBLIC_SENTRY_DEV !== 'true'
          ) {
            return null;
          }
          return event;
        },
      });
      return Sentry;
    })
    .catch(() => null);
  return loading;
}

export function captureClientException(error: unknown): void {
  void loadSentry().then((Sentry) => Sentry?.captureException(error));
}

import * as Sentry from '@sentry/nextjs';

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    const stack = event.error instanceof Error ? (event.error.stack ?? '') : '';
    if (event.message.includes("reading 'startTime'") && stack.includes('reportAllChanges')) {
      event.preventDefault();
    }
  });
}

Sentry.init({
  dsn,
  environment: process.env.NODE_ENV,
  enabled: Boolean(dsn),
  tracesSampleRate: dsn && process.env.NODE_ENV === 'production' ? 0.1 : 0,
  sendDefaultPii: false,
  integrations(integrations) {
    return integrations.filter((integration) => integration.name !== 'BrowserTracing');
  },
  beforeSend(event) {
    if (process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_SENTRY_DEV !== 'true') {
      return null;
    }
    return event;
  },
});

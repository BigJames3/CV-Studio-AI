import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  enabled: Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN),
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 0,
  sendDefaultPii: false,
  beforeSend(event) {
    if (process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_SENTRY_DEV !== 'true') {
      return null;
    }
    return event;
  },
});

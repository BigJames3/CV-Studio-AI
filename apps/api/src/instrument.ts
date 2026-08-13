import * as Sentry from '@sentry/nestjs';

const dsn = process.env.SENTRY_DSN;
const enabled = Boolean(dsn && !dsn.includes('xxx'));

Sentry.init({
  dsn: enabled ? dsn : undefined,
  enabled,
  environment: process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV ?? 'development',
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  sendDefaultPii: false,
});

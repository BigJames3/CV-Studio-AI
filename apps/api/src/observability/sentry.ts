import * as Sentry from '@sentry/node';

export function isSentryConfigured(): boolean {
  const dsn = process.env.SENTRY_DSN;
  return Boolean(dsn && !dsn.includes('xxx'));
}

export function initSentry(): void {
  if (!isSentryConfigured() || process.env.NODE_ENV === 'test') return;

  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV ?? 'development',
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 0,
    sendDefaultPii: false,
    beforeSend(event) {
      if (process.env.NODE_ENV === 'development' && process.env.SENTRY_DEV !== 'true') {
        return null;
      }
      return event;
    },
  });
}

export function captureServerException(
  error: unknown,
  context: {
    level?: 'error' | 'fatal';
    tags?: Record<string, string>;
    extra?: Record<string, unknown>;
  } = {}
): void {
  if (!isSentryConfigured() || process.env.NODE_ENV === 'test') return;

  Sentry.withScope((scope) => {
    scope.setLevel(context.level ?? 'error');
    if (context.tags) {
      for (const [key, value] of Object.entries(context.tags)) {
        scope.setTag(key, value);
      }
    }
    if (context.extra) {
      scope.setExtras(context.extra);
    }
    Sentry.captureException(error);
  });
}

export async function closeSentry(): Promise<void> {
  await Sentry.close(2000);
}

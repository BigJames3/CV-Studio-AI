import { Logger } from '@nestjs/common';
import { captureServerException, initSentry, isSentryConfigured } from './sentry';
import { isPostHogConfigured, getMarketingSpendMonthly } from './posthog';

const logger = new Logger('Observability');

export function bootstrapObservability(): void {
  initSentry();

  if (process.env.NODE_ENV === 'production') {
    if (!isSentryConfigured()) {
      logger.warn('SENTRY_DSN is missing — API errors will not reach Sentry');
    }
    if (!isPostHogConfigured()) {
      logger.warn('POSTHOG_API_KEY is missing — server events stay in analytics_events only');
    }
  }

  const spend = getMarketingSpendMonthly();
  logger.log(
    `observability sentry=${isSentryConfigured()} posthog=${isPostHogConfigured()} marketingSpend=${spend || '—'}`
  );
}

export { captureServerException };
export { emitSecurityAlert } from './security-alert';

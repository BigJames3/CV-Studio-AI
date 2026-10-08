import { Logger } from '@nestjs/common';
import { captureServerException, initSentry, isSentryConfigured } from './sentry';
import { getMarketingSpendMonthly, isServerCaptureEnabled } from './posthog';

const logger = new Logger('Observability');

export function bootstrapObservability(): void {
  initSentry();

  if (process.env.NODE_ENV === 'production') {
    if (!isSentryConfigured()) {
      logger.warn('SENTRY_DSN is missing — API errors will not reach Sentry');
    }
  }

  const spend = getMarketingSpendMonthly();
  logger.log(
    `observability sentry=${isSentryConfigured()} posthogServerCapture=${isServerCaptureEnabled()} marketingSpend=${spend || '—'}`
  );
}

export { captureServerException };
export { emitSecurityAlert } from './security-alert';

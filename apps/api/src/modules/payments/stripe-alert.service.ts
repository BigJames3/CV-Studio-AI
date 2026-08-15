import { Injectable, Logger } from '@nestjs/common';
import { captureServerException } from '../../observability';

/**
 * Production alerting for payment-loss scenarios.
 * Uses Sentry when SENTRY_DSN is set; always logs at fatal level.
 */
@Injectable()
export class StripeAlertService {
  private readonly logger = new Logger(StripeAlertService.name);

  captureException(
    error: unknown,
    context: {
      eventId?: string;
      eventType?: string;
      retries?: number;
      level?: 'error' | 'fatal';
      extra?: Record<string, unknown>;
    } = {}
  ): void {
    const err = error instanceof Error ? error : new Error(String(error));
    const level = context.level ?? 'fatal';
    const payload = {
      message: err.message,
      stack: err.stack,
      level,
      webhook: {
        eventId: context.eventId,
        eventType: context.eventType,
        retries: context.retries,
      },
      ...context.extra,
    };

    this.logger.error(`[payment-alert:${level}] ${err.message}`, JSON.stringify(payload));

    captureServerException(err, {
      level,
      tags: { module: 'stripe-webhook' },
      extra: payload,
    });
  }
}

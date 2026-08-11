import { Injectable, Logger } from '@nestjs/common';

/**
 * Production alerting for payment-loss scenarios.
 * Uses Sentry HTTP envelope when SENTRY_DSN is set; always logs at fatal level.
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

    const dsn = process.env.SENTRY_DSN;
    if (!dsn || dsn.includes('xxx')) return;

    void this.postToSentry(dsn, err, payload).catch((sendErr) => {
      this.logger.warn(`Sentry send failed: ${(sendErr as Error).message}`);
    });
  }

  private async postToSentry(
    dsn: string,
    err: Error,
    extra: Record<string, unknown>
  ): Promise<void> {
    // DSN: https://<key>@<host>/<project>
    const match = dsn.match(/^https:\/\/([^@]+)@([^/]+)\/(\d+)/);
    if (!match) return;
    const [, key, host, project] = match;
    const url = `https://${host}/api/${project}/store/`;
    const body = {
      message: err.message,
      level: (extra.level as string) ?? 'fatal',
      platform: 'node',
      exception: {
        values: [
          {
            type: err.name,
            value: err.message,
            stacktrace: err.stack
              ? { frames: err.stack.split('\n').slice(1).map((l) => ({ filename: l.trim() })) }
              : undefined,
          },
        ],
      },
      tags: { module: 'stripe-webhook' },
      extra,
      timestamp: Date.now() / 1000,
    };

    await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Sentry-Auth': `Sentry sentry_version=7, sentry_key=${key}, sentry_client=cvstudio-api/1.0`,
      },
      body: JSON.stringify(body),
    });
  }
}

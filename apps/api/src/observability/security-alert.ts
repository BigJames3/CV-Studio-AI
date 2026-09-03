import { Logger } from '@nestjs/common';
import { captureServerException } from './sentry';

export type SecurityAlertSeverity = 'P1' | 'P2' | 'P3';

const logger = new Logger('SecurityAlert');

/**
 * Structured security alerts (SEC-01… catalog). Logs always; Sentry on P1/P2;
 * optional IR_WEBHOOK_URL (Slack/Teams incoming webhook) on P1.
 */
export function emitSecurityAlert(alert: {
  id: string;
  severity: SecurityAlertSeverity;
  message: string;
  extra?: Record<string, unknown>;
}): void {
  const payload = {
    msg: 'security_alert',
    id: alert.id,
    severity: alert.severity,
    message: alert.message,
    extra: alert.extra ?? {},
    ts: new Date().toISOString(),
  };
  logger.error(JSON.stringify(payload));

  if (alert.severity === 'P1' || alert.severity === 'P2') {
    captureServerException(new Error(`[${alert.id}] ${alert.message}`), {
      level: alert.severity === 'P1' ? 'fatal' : 'error',
      tags: { alert_id: alert.id, severity: alert.severity },
      extra: alert.extra,
    });
  }

  const webhook = process.env.IR_WEBHOOK_URL?.trim();
  if (webhook && alert.severity === 'P1') {
    void fetch(webhook, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    }).catch(() => undefined);
  }
}

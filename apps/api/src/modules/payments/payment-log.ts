import { Logger } from '@nestjs/common';

export function logPayment(
  logger: Logger,
  level: 'log' | 'warn' | 'error' | 'debug',
  payload: Record<string, unknown>
) {
  if (process.env.LOG_PAYMENTS === 'false') return;
  logger[level](JSON.stringify({ ...payload, ts: new Date().toISOString() }));
}

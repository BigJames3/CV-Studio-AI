import { Logger } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { clientIp } from '../utils/client-ip';
import { isJsonLogFormat } from '../../observability/json-logger';

const logger = new Logger('HTTP');

/** Kubernetes probes hit these every few seconds: log them only when they fail. */
const QUIET_PATHS = /^\/api\/v\d+\/health(\/|$)/;

/**
 * Access log written when the response is sent, so every request is logged, including those
 * rejected before any interceptor runs (JwtAuthGuard 401, feature gate 403, throttler 429,
 * unknown route 404). Registered with app.use() in main.ts, ahead of Nest's own routing.
 *
 * The query string is never logged (search terms, and whatever a client puts in a URL).
 */
export function httpLoggingMiddleware(req: Request, res: Response, next: NextFunction) {
  const started = process.hrtime.bigint();

  res.on('finish', () => {
    const path = (req.originalUrl ?? req.url).split('?')[0];
    const status = res.statusCode;
    if (status < 400 && QUIET_PATHS.test(path)) return;

    const entry = {
      msg: 'http',
      method: req.method,
      path,
      status,
      ms: Math.round(Number(process.hrtime.bigint() - started) / 1e5) / 10,
      requestId: req.headers['x-request-id'] as string | undefined,
      userId: (req as Request & { user?: { id?: string } }).user?.id,
      ip: clientIp(req),
    };

    const write = status >= 500 ? 'error' : status >= 400 ? 'warn' : 'log';
    if (isJsonLogFormat()) {
      logger[write](entry);
    } else {
      logger[write](
        `${entry.method} ${entry.path} ${status} ${entry.ms}ms user=${entry.userId ?? '-'} requestId=${entry.requestId ?? '-'}`
      );
    }
  });

  next();
}

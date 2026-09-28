import type { NextFunction, Request, Response } from 'express';
import { httpRequestDuration } from '../../observability/metrics';

/**
 * Records http_request_duration_seconds for every response, guard rejections included.
 * The route label is the Express route template (`/api/v1/cvs/:id`), never the raw URL, so
 * ids do not create new series; requests that match no route share `route="unmatched"`.
 */
export function httpMetricsMiddleware(req: Request, res: Response, next: NextFunction) {
  const end = httpRequestDuration.startTimer();
  res.on('finish', () => {
    end({
      method: req.method,
      route: routeTemplate(req),
      status: String(res.statusCode),
    });
  });
  next();
}

export function routeTemplate(req: Request): string {
  const path = (req.route as { path?: unknown } | undefined)?.path;
  return typeof path === 'string' ? `${req.baseUrl ?? ''}${path}` : 'unmatched';
}

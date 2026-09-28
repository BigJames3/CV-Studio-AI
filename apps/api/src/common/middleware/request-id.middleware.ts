import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

/** An upstream id (web app, proxy) is kept only if it looks like one: it ends up in every log line. */
const VALID_REQUEST_ID = /^[A-Za-z0-9._:-]{1,128}$/;

export function resolveRequestId(header: string | string[] | undefined): string {
  const value = Array.isArray(header) ? header[0] : header;
  return value && VALID_REQUEST_ID.test(value) ? value : randomUUID();
}

/** Also registered with app.use() in main.ts so unrouted requests (404) get an id too. */
export function requestIdMiddleware(req: Request, res: Response, next: NextFunction) {
  const id = resolveRequestId(req.headers['x-request-id']);
  req.headers['x-request-id'] = id;
  res.setHeader('X-Request-Id', id);
  next();
}

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    requestIdMiddleware(req, res, next);
  }
}

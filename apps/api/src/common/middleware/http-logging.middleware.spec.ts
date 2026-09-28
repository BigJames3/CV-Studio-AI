import { EventEmitter } from 'events';
import { Logger } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { httpLoggingMiddleware } from './http-logging.middleware';
import { resolveRequestId } from './request-id.middleware';

function run(opts: { url: string; status: number; user?: { id: string } }) {
  const req = {
    method: 'GET',
    originalUrl: opts.url,
    url: opts.url,
    headers: { 'x-request-id': 'req-123' },
    ip: '203.0.113.7',
    socket: {},
  } as unknown as Request;
  const res = Object.assign(new EventEmitter(), { statusCode: opts.status }) as unknown as Response;
  const next = jest.fn() as NextFunction;

  httpLoggingMiddleware(req, res, next);
  // Guards run after this middleware and set req.user before the response is sent.
  if (opts.user) (req as Request & { user?: unknown }).user = opts.user;
  (res as unknown as EventEmitter).emit('finish');
  return { next };
}

describe('httpLoggingMiddleware', () => {
  const env = process.env.LOG_FORMAT;
  let spies: Record<'log' | 'warn' | 'error', jest.SpyInstance>;

  beforeEach(() => {
    process.env.LOG_FORMAT = 'json';
    spies = {
      log: jest.spyOn(Logger.prototype, 'log').mockImplementation(),
      warn: jest.spyOn(Logger.prototype, 'warn').mockImplementation(),
      error: jest.spyOn(Logger.prototype, 'error').mockImplementation(),
    };
  });

  afterEach(() => {
    jest.restoreAllMocks();
    if (env === undefined) delete process.env.LOG_FORMAT;
    else process.env.LOG_FORMAT = env;
  });

  it('logs requests rejected before any interceptor (401), as a warning', () => {
    const { next } = run({ url: '/api/v1/cvs', status: 401 });

    expect(next).toHaveBeenCalled();
    expect(spies.warn).toHaveBeenCalledWith(
      expect.objectContaining({
        msg: 'http',
        method: 'GET',
        path: '/api/v1/cvs',
        status: 401,
        requestId: 'req-123',
        ip: '203.0.113.7',
      })
    );
  });

  it('logs 5xx as errors and 2xx as info, with the authenticated user', () => {
    run({ url: '/api/v1/cvs/1', status: 500 });
    run({ url: '/api/v1/cvs', status: 200, user: { id: 'user-1' } });

    expect(spies.error).toHaveBeenCalledWith(expect.objectContaining({ status: 500 }));
    expect(spies.log).toHaveBeenCalledWith(
      expect.objectContaining({ status: 200, userId: 'user-1' })
    );
  });

  it('never logs the query string', () => {
    run({ url: '/api/v1/marketplace?q=jane.doe@example.com', status: 200 });

    const [entry] = spies.log.mock.calls[0] as [Record<string, unknown>];
    expect(entry.path).toBe('/api/v1/marketplace');
    expect(JSON.stringify(entry)).not.toContain('jane.doe');
  });

  it('skips successful health probes but logs failing ones', () => {
    run({ url: '/api/v1/health', status: 200 });
    run({ url: '/api/v1/health/ready', status: 200 });
    run({ url: '/api/v1/health/ready', status: 503 });

    expect(spies.log).not.toHaveBeenCalled();
    expect(spies.error).toHaveBeenCalledTimes(1);
  });

  it('writes a text line when LOG_FORMAT is not json', () => {
    delete process.env.LOG_FORMAT;
    run({ url: '/api/v1/cvs?x=1', status: 404 });

    expect(spies.warn).toHaveBeenCalledWith(
      expect.stringMatching(/^GET \/api\/v1\/cvs 404 [\d.]+ms user=- requestId=req-123$/)
    );
  });
});

describe('resolveRequestId', () => {
  it('keeps a well-formed upstream id', () => {
    expect(resolveRequestId('web-7f3a9c1e.42')).toBe('web-7f3a9c1e.42');
  });

  it('replaces missing, oversized or injected ids with a UUID', () => {
    const uuid = /^[0-9a-f-]{36}$/;
    expect(resolveRequestId(undefined)).toMatch(uuid);
    expect(resolveRequestId('A'.repeat(300))).toMatch(uuid);
    expect(resolveRequestId('abc\n{"level":"fatal"}')).toMatch(uuid);
    expect(resolveRequestId(['ok-1', 'ok-2'])).toBe('ok-1');
  });
});

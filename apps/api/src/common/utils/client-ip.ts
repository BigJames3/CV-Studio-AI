import type { Request } from 'express';

/**
 * Client IP from Express's trusted proxy chain (`req.ip`).
 * Never parse `X-Forwarded-For` manually — the leftmost hop is client-spoofable.
 * Enable `TRUST_PROXY=1` (or a hop count / CIDR list) only when behind a reverse proxy.
 */
export function clientIp(req: Request): string {
  const ip = req.ip || req.socket?.remoteAddress || '';
  return ip.replace(/^::ffff:/, '') || 'unknown';
}

export function isMobileClient(req: Pick<Request, 'headers'>): boolean {
  const raw = req.headers['x-client'] ?? req.headers['x-cv-client'];
  const value = Array.isArray(raw) ? raw[0] : raw;
  return typeof value === 'string' && value.trim().toLowerCase() === 'mobile';
}

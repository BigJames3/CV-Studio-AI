import type { Response } from 'supertest';

export const STRONG_PASSWORD = 'Str0ngpass1!x';
export const STRONG_PASSWORD_ALT = 'NewStr0ng9!aa';

export function refreshFromCookie(res: Response): string {
  const raw = res.headers['set-cookie'];
  const list = Array.isArray(raw) ? raw : raw ? [raw] : [];
  const line = list.find((c) => c.startsWith('refresh_token='));
  if (!line) {
    throw new Error('refresh_token cookie missing');
  }
  return decodeURIComponent(line.split(';')[0].slice('refresh_token='.length));
}

export function cookieHeader(res: Response): string {
  const raw = res.headers['set-cookie'];
  if (!raw) return '';
  return (Array.isArray(raw) ? raw : [raw]).join('; ');
}

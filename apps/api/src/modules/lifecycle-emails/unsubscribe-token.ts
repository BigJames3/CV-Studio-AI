import { createHmac, timingSafeEqual } from 'crypto';

/**
 * Signed one-click unsubscribe links: HMAC-SHA256 of the user id with a key derived from
 * ENCRYPTION_KEY for this purpose only, so a link cannot be forged for another user and the
 * key is not the one used for anything else.
 */
function key(env: NodeJS.ProcessEnv = process.env): Buffer {
  const secret = env.ENCRYPTION_KEY ?? env.JWT_ACCESS_SECRET;
  if (!secret) throw new Error('ENCRYPTION_KEY is required to sign unsubscribe links');
  return createHmac('sha256', secret).update('lifecycle-emails:unsubscribe:v1').digest();
}

export function signUnsubscribe(userId: string, env?: NodeJS.ProcessEnv): string {
  return createHmac('sha256', key(env)).update(userId).digest('base64url');
}

export function verifyUnsubscribe(
  userId: string | undefined,
  token: string | undefined,
  env?: NodeJS.ProcessEnv
): boolean {
  if (!userId || !token) return false;
  const expected = Buffer.from(signUnsubscribe(userId, env));
  const given = Buffer.from(token);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

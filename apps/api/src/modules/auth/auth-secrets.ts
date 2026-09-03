/** Fail-closed JWT / encryption secret loading. No hardcoded production fallbacks. */

export const MIN_SECRET_LENGTH = 32;

export const DEFAULT_SECRETS = [
  'dev-access-secret-change-me',
  'dev-refresh-secret-change-me',
  'dev-encryption-key',
  'dev-only-change-me-access',
  'dev-only-change-me-refresh',
  'change-me',
] as const;

export class AuthSecretError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthSecretError';
  }
}

type Env = NodeJS.Dict<string | undefined>;

function read(env: Env, key: string): string {
  return (env[key] ?? '').trim();
}

function isDefaultSecret(value: string): boolean {
  return (DEFAULT_SECRETS as readonly string[]).includes(value);
}

export function assertAuthSecrets(env: Env = process.env): void {
  const access = read(env, 'JWT_ACCESS_SECRET');
  const refresh = read(env, 'JWT_REFRESH_SECRET');
  const encryption = read(env, 'ENCRYPTION_KEY');
  const isProd = read(env, 'NODE_ENV') === 'production';

  if (!access) {
    throw new AuthSecretError(
      'CRITICAL: JWT_ACCESS_SECRET not set or using default. Set a strong ≥32 char secret in production.'
    );
  }
  if (isDefaultSecret(access)) {
    throw new AuthSecretError(
      'CRITICAL: JWT_ACCESS_SECRET not set or using default. Set a strong ≥32 char secret in production.'
    );
  }
  if (access.length < MIN_SECRET_LENGTH) {
    throw new AuthSecretError(
      `CRITICAL: JWT_ACCESS_SECRET must be ≥${MIN_SECRET_LENGTH} chars (got ${access.length}).`
    );
  }

  if (!refresh) {
    throw new AuthSecretError(
      'CRITICAL: JWT_REFRESH_SECRET not set or using default. Set a strong ≥32 char secret in production.'
    );
  }
  if (isDefaultSecret(refresh)) {
    throw new AuthSecretError(
      'CRITICAL: JWT_REFRESH_SECRET not set or using default. Set a strong ≥32 char secret in production.'
    );
  }
  if (refresh.length < MIN_SECRET_LENGTH) {
    throw new AuthSecretError(
      `CRITICAL: JWT_REFRESH_SECRET must be ≥${MIN_SECRET_LENGTH} chars (got ${refresh.length}).`
    );
  }

  if (access === refresh) {
    throw new AuthSecretError(
      'CRITICAL: JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be different.'
    );
  }

  const encryptionMissing = !encryption || isDefaultSecret(encryption);
  const encryptionShort = Boolean(encryption) && encryption.length < MIN_SECRET_LENGTH;
  if (encryptionMissing || encryptionShort) {
    if (isProd) {
      throw new AuthSecretError(
        'CRITICAL: ENCRYPTION_KEY not set or using default. Set a strong ≥32 char key in production.'
      );
    }
    // Non-prod: OAuth token encryption falls back to JWT_ACCESS_SECRET (still ≥32 and distinct).
    // eslint-disable-next-line no-console
    console.warn(
      'WARNING: ENCRYPTION_KEY not set; OAuth tokens may be encrypted with JWT_ACCESS_SECRET. Set ENCRYPTION_KEY for production.'
    );
  }
}

export function getJwtAccessSecret(env: Env = process.env): string {
  const access = read(env, 'JWT_ACCESS_SECRET');
  if (!access || isDefaultSecret(access)) {
    throw new AuthSecretError('JWT_ACCESS_SECRET not configured');
  }
  return access;
}

export function getJwtRefreshSecret(env: Env = process.env): string {
  const refresh = read(env, 'JWT_REFRESH_SECRET');
  if (!refresh || isDefaultSecret(refresh)) {
    throw new AuthSecretError('JWT_REFRESH_SECRET not configured');
  }
  return refresh;
}

export function getEncryptionKey(env: Env = process.env): string {
  const encryption = read(env, 'ENCRYPTION_KEY');
  if (encryption && !isDefaultSecret(encryption) && encryption.length >= MIN_SECRET_LENGTH) {
    return encryption;
  }
  if (read(env, 'NODE_ENV') === 'production') {
    throw new AuthSecretError('ENCRYPTION_KEY not configured');
  }
  return getJwtAccessSecret(env);
}

/** Parse `15m` / `7d` / `3600` / `3600s` into seconds. */
export function parseTtlSeconds(raw: string | undefined, fallbackSeconds: number): number {
  if (!raw?.trim()) return fallbackSeconds;
  const match = /^(\d+)\s*(ms|s|m|h|d)?$/i.exec(raw.trim());
  if (!match) return fallbackSeconds;
  const n = Number(match[1]);
  const unit = (match[2] ?? 's').toLowerCase();
  const mult: Record<string, number> = { ms: 0.001, s: 1, m: 60, h: 3600, d: 86400 };
  const seconds = Math.floor(n * (mult[unit] ?? 1));
  return seconds > 0 ? seconds : fallbackSeconds;
}

export function getAccessTtlSeconds(env: Env = process.env): number {
  return parseTtlSeconds(env.JWT_ACCESS_TTL ?? env.JWT_EXPIRATION, 15 * 60);
}

export function getRefreshTtlSeconds(env: Env = process.env): number {
  return parseTtlSeconds(env.JWT_REFRESH_TTL ?? env.JWT_REFRESH_EXPIRATION, 7 * 24 * 60 * 60);
}

export function getIdleTimeoutSeconds(env: Env = process.env): number {
  return parseTtlSeconds(env.JWT_IDLE_TIMEOUT, 60 * 60);
}

export function getPre2faTtlSeconds(env: Env = process.env): number {
  return parseTtlSeconds(env.JWT_PRE_2FA_TTL, 5 * 60);
}

export function jwtExpiresIn(seconds: number): `${number}s` {
  return `${seconds}s`;
}

export function getLockoutAttempts(env: Env = process.env): number {
  const n = Number(env.ACCOUNT_LOCKOUT_ATTEMPTS ?? 5);
  return Number.isFinite(n) && n > 0 ? n : 5;
}

export function getLockoutMinutes(env: Env = process.env): number {
  const n = Number(env.ACCOUNT_LOCKOUT_MINUTES ?? 15);
  return Number.isFinite(n) && n > 0 ? n : 15;
}

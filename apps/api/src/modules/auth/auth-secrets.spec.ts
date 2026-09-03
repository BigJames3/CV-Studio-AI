import {
  assertAuthSecrets,
  AuthSecretError,
  getEncryptionKey,
  getJwtAccessSecret,
  getJwtRefreshSecret,
  parseTtlSeconds,
} from './auth-secrets';

const strongA = 'a'.repeat(32);
const strongB = 'b'.repeat(32);
const strongC = 'c'.repeat(32);

describe('assertAuthSecrets', () => {
  it('fails if JWT_ACCESS_SECRET is missing', () => {
    expect(() =>
      assertAuthSecrets({
        JWT_ACCESS_SECRET: '',
        JWT_REFRESH_SECRET: strongB,
        NODE_ENV: 'test',
      })
    ).toThrow(/JWT_ACCESS_SECRET not set/);
  });

  it('fails if JWT_REFRESH_SECRET uses a default value', () => {
    expect(() =>
      assertAuthSecrets({
        JWT_ACCESS_SECRET: strongA,
        JWT_REFRESH_SECRET: 'dev-refresh-secret-change-me',
        NODE_ENV: 'test',
      })
    ).toThrow(/using default/);
  });

  it('fails if access and refresh secrets are identical', () => {
    expect(() =>
      assertAuthSecrets({
        JWT_ACCESS_SECRET: strongA,
        JWT_REFRESH_SECRET: strongA,
        NODE_ENV: 'test',
      })
    ).toThrow(/must be different/);
  });

  it('fails if secrets are shorter than 32 chars', () => {
    expect(() =>
      assertAuthSecrets({
        JWT_ACCESS_SECRET: 'short-access-secret',
        JWT_REFRESH_SECRET: strongB,
        NODE_ENV: 'test',
      })
    ).toThrow(/≥32 chars/);
  });

  it('fails closed on ENCRYPTION_KEY in production', () => {
    expect(() =>
      assertAuthSecrets({
        JWT_ACCESS_SECRET: strongA,
        JWT_REFRESH_SECRET: strongB,
        ENCRYPTION_KEY: 'dev-encryption-key',
        NODE_ENV: 'production',
      })
    ).toThrow(AuthSecretError);
  });

  it('accepts strong distinct secrets', () => {
    expect(() =>
      assertAuthSecrets({
        JWT_ACCESS_SECRET: strongA,
        JWT_REFRESH_SECRET: strongB,
        ENCRYPTION_KEY: strongC,
        NODE_ENV: 'production',
      })
    ).not.toThrow();
  });
});

describe('secret getters', () => {
  it('throws when access secret is missing', () => {
    expect(() => getJwtAccessSecret({ JWT_ACCESS_SECRET: '' })).toThrow(
      'JWT_ACCESS_SECRET not configured'
    );
  });

  it('returns configured secrets', () => {
    const env = {
      JWT_ACCESS_SECRET: strongA,
      JWT_REFRESH_SECRET: strongB,
      ENCRYPTION_KEY: strongC,
    };
    expect(getJwtAccessSecret(env)).toBe(strongA);
    expect(getJwtRefreshSecret(env)).toBe(strongB);
    expect(getEncryptionKey(env)).toBe(strongC);
  });
});

describe('parseTtlSeconds', () => {
  it('parses duration strings', () => {
    expect(parseTtlSeconds('15m', 1)).toBe(900);
    expect(parseTtlSeconds('7d', 1)).toBe(7 * 24 * 3600);
    expect(parseTtlSeconds('3600', 1)).toBe(3600);
    expect(parseTtlSeconds(undefined, 42)).toBe(42);
  });
});

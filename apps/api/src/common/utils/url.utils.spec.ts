import { appOriginFromEnv, safeReturnUrl } from './url.utils';

describe('safeReturnUrl', () => {
  const origin = 'http://localhost:3000';
  const fallback = `${origin}/account/billing?checkout=success`;

  it('allows a valid /account/billing URL', () => {
    const input = `${origin}/account/billing?checkout=success`;
    expect(safeReturnUrl(input, fallback, origin)).toBe(
      'http://localhost:3000/account/billing?checkout=success'
    );
  });

  it('blocks a different origin', () => {
    expect(safeReturnUrl('https://evil.example/phish', fallback, origin)).toBe(fallback);
  });

  it('blocks an invalid path on the same origin', () => {
    expect(safeReturnUrl(`${origin}/dashboard`, fallback, origin)).toBe(fallback);
    expect(safeReturnUrl(`${origin}/account/billing-evil`, fallback, origin)).toBe(fallback);
  });

  it('uses fallback for null/undefined/empty', () => {
    expect(safeReturnUrl(undefined, fallback, origin)).toBe(fallback);
    expect(safeReturnUrl('', fallback, origin)).toBe(fallback);
    expect(safeReturnUrl('   ', fallback, origin)).toBe(fallback);
  });

  it('uses fallback for a malformed URL', () => {
    expect(safeReturnUrl('not a url', fallback, origin)).toBe(fallback);
    expect(safeReturnUrl('javascript:alert(1)', fallback, origin)).toBe(fallback);
  });

  it('blocks protocol-relative and credentialed URLs', () => {
    expect(safeReturnUrl('//evil.example/account/billing', fallback, origin)).toBe(fallback);
    expect(safeReturnUrl(`http://user:pass@localhost:3000/account/billing`, fallback, origin)).toBe(
      fallback
    );
  });

  it('resolves path traversal to a non-billing path and blocks it', () => {
    expect(safeReturnUrl(`${origin}/account/billing/../admin`, fallback, origin)).toBe(fallback);
  });
});

describe('appOriginFromEnv', () => {
  const originalApp = process.env.APP_URL;
  const originalPublic = process.env.NEXT_PUBLIC_APP_URL;

  afterEach(() => {
    if (originalApp === undefined) delete process.env.APP_URL;
    else process.env.APP_URL = originalApp;
    if (originalPublic === undefined) delete process.env.NEXT_PUBLIC_APP_URL;
    else process.env.NEXT_PUBLIC_APP_URL = originalPublic;
  });

  it('prefers APP_URL and strips a trailing slash', () => {
    process.env.APP_URL = 'https://cvstudio.ai/';
    expect(appOriginFromEnv()).toBe('https://cvstudio.ai');
  });
});

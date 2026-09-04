import {
  clearAuthCookies,
  REFRESH_COOKIE,
  SESSION_FLAG_COOKIE,
  refreshCookieOptions,
  useSecureCookies,
} from './auth-cookies';

describe('clearAuthCookies', () => {
  it('clears refresh + session flag with matching cookie attributes', () => {
    const clearCookie = jest.fn();
    const cookie = jest.fn();
    const res = { clearCookie, cookie } as never;

    clearAuthCookies(res);

    expect(clearCookie).toHaveBeenCalledWith(
      REFRESH_COOKIE,
      expect.objectContaining({
        path: '/',
        httpOnly: true,
        sameSite: 'lax',
      })
    );
    expect(clearCookie).toHaveBeenCalledWith(
      SESSION_FLAG_COOKIE,
      expect.objectContaining({
        path: '/',
        httpOnly: false,
        sameSite: 'lax',
      })
    );
    expect(cookie).toHaveBeenCalledWith(
      REFRESH_COOKIE,
      '',
      expect.objectContaining({ maxAge: 0, path: '/' })
    );
    expect(cookie).toHaveBeenCalledWith(
      SESSION_FLAG_COOKIE,
      '',
      expect.objectContaining({ maxAge: 0, path: '/' })
    );
  });
});

describe('useSecureCookies', () => {
  const env = { ...process.env };

  afterEach(() => {
    process.env.NODE_ENV = env.NODE_ENV;
    process.env.APP_URL = env.APP_URL;
    process.env.API_URL = env.API_URL;
    process.env.COOKIE_SECURE = env.COOKIE_SECURE;
  });

  it('does not set Secure on HTTP even when NODE_ENV=production', () => {
    process.env.NODE_ENV = 'production';
    process.env.APP_URL = 'http://localhost:3000';
    delete process.env.COOKIE_SECURE;
    expect(useSecureCookies()).toBe(false);
    expect(refreshCookieOptions().secure).toBe(false);
  });

  it('sets Secure on HTTPS production', () => {
    process.env.NODE_ENV = 'production';
    process.env.APP_URL = 'https://app.cvstudio.ai';
    delete process.env.COOKIE_SECURE;
    expect(useSecureCookies()).toBe(true);
    expect(refreshCookieOptions().secure).toBe(true);
  });

  it('honors COOKIE_SECURE override', () => {
    process.env.NODE_ENV = 'production';
    process.env.APP_URL = 'https://app.cvstudio.ai';
    process.env.COOKIE_SECURE = 'false';
    expect(useSecureCookies()).toBe(false);
  });
});

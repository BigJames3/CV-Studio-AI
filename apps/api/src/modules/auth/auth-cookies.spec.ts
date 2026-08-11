import { clearAuthCookies, REFRESH_COOKIE, SESSION_FLAG_COOKIE } from './auth-cookies';

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

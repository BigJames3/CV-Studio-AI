import { isServerCaptureEnabled, sanitizeEventProperties } from './posthog';

describe('sanitizeEventProperties', () => {
  it('drops secrets, html, and oversized strings', () => {
    const out = sanitizeEventProperties({
      plan: 'pro',
      password: 'secret',
      html: '<p>cv</p>',
      token: 'abc',
      note: 'ok',
      huge: 'x'.repeat(501),
    });
    expect(out).toEqual({ plan: 'pro', note: 'ok' });
  });
});

describe('isServerCaptureEnabled', () => {
  it('stays off with only a key: server events ignore the cookie choice', () => {
    expect(isServerCaptureEnabled({ POSTHOG_API_KEY: 'phc_x' })).toBe(false);
  });

  it('turns on only when explicitly enabled', () => {
    expect(
      isServerCaptureEnabled({ POSTHOG_API_KEY: 'phc_x', POSTHOG_SERVER_CAPTURE: 'true' })
    ).toBe(true);
    expect(isServerCaptureEnabled({ POSTHOG_SERVER_CAPTURE: 'true' })).toBe(false);
  });
});

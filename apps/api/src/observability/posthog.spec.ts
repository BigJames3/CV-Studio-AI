import { sanitizeEventProperties } from './posthog';

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

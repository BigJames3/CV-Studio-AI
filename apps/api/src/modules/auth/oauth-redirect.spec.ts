import { sanitizeNextPath } from './oauth-redirect';

describe('sanitizeNextPath', () => {
  const app = 'http://localhost:3000';

  it('rejects off-origin URLs', () => {
    expect(sanitizeNextPath('https://evil.com/steal-data', app)).toBe('/dashboard');
    expect(sanitizeNextPath('//evil.com', app)).toBe('/dashboard');
    expect(sanitizeNextPath('javascript:alert(1)', app)).toBe('/dashboard');
  });

  it('accepts relative paths', () => {
    expect(sanitizeNextPath('/dashboard', app)).toBe('/dashboard');
    expect(sanitizeNextPath('/account/billing?tab=invoices', app)).toBe(
      '/account/billing?tab=invoices'
    );
  });

  it('accepts same-origin absolute URLs as a path', () => {
    expect(sanitizeNextPath('http://localhost:3000/editor', app)).toBe('/editor');
  });
});

import { test, expect } from '@playwright/test';
import { isAppRoute, isAuthPage } from '../../src/lib/auth-routes';

test.describe('auth route helpers', () => {
  test('only app prefixes require auth', () => {
    expect(isAppRoute('/')).toBe(false);
    expect(isAppRoute('/pricing')).toBe(false);
    expect(isAppRoute('/marketplace')).toBe(false);
    expect(isAppRoute('/marketplace/abc')).toBe(false);
    expect(isAppRoute('/login')).toBe(false);
    expect(isAppRoute('/templates')).toBe(false);
    expect(isAppRoute('/dashboard')).toBe(true);
    expect(isAppRoute('/dashboard/templates')).toBe(true);
    expect(isAppRoute('/account/billing')).toBe(true);
    expect(isAppRoute('/editor/xyz')).toBe(true);
    expect(isAppRoute('/seller')).toBe(true);
    expect(isAppRoute('/seller/listings/new')).toBe(true);
  });

  test('auth pages are login and register', () => {
    expect(isAuthPage('/login')).toBe(true);
    expect(isAuthPage('/register')).toBe(true);
    expect(isAuthPage('/forgot-password')).toBe(false);
    expect(isAuthPage('/marketplace')).toBe(false);
  });
});

async function countMeCalls(page: import('@playwright/test').Page) {
  let meCalls = 0;
  await page.route('**/api/v1/users/me**', async (route) => {
    meCalls += 1;
    await route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Unauthorized' },
      }),
    });
  });
  return () => meCalls;
}

test.describe('Public routes stay public', () => {
  for (const path of ['/', '/pricing', '/marketplace', '/login'] as const) {
    test(`${path} stays on the page and does not call /users/me`, async ({ page }) => {
      const meCalls = await countMeCalls(page);
      const response = await page.goto(path, { waitUntil: 'domcontentloaded' });
      expect(response?.ok() || response?.status() === 304).toBeTruthy();
      expect(new URL(page.url()).pathname).toBe(path);
      expect(meCalls(), `GET /users/me must not run on ${path}`).toBe(0);
    });
  }

  test('marketplace listing without session is not sent to login', async ({ page }) => {
    const meCalls = await countMeCalls(page);
    await page.goto('/marketplace/demo-listing', { waitUntil: 'domcontentloaded' });
    expect(new URL(page.url()).pathname).toBe('/marketplace/demo-listing');
    expect(meCalls()).toBe(0);
  });
});

test.describe('App routes require auth', () => {
  test('GET /dashboard without session redirects to login with next', async ({ request }) => {
    const res = await request.get('/dashboard', { maxRedirects: 0 });
    expect(res.status()).toBe(307);
    const location = res.headers()['location'] ?? '';
    expect(location).toMatch(/\/login/);
    expect(location).toContain('next=%2Fdashboard');
  });

  test('GET /account/billing without session redirects to login with next', async ({ request }) => {
    const res = await request.get('/account/billing', { maxRedirects: 0 });
    expect(res.status()).toBe(307);
    const location = res.headers()['location'] ?? '';
    expect(location).toMatch(/\/login/);
    expect(location).toContain('next=%2Faccount%2Fbilling');
  });

  test('GET /seller without session redirects to login', async ({ request }) => {
    const res = await request.get('/seller', { maxRedirects: 0 });
    expect(res.status()).toBe(307);
    const location = res.headers()['location'] ?? '';
    expect(location).toMatch(/\/login/);
    expect(location).toContain('next=%2Fseller');
  });
});

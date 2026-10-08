import { readFile } from 'node:fs/promises';
import { test, expect, loginAs } from '../fixtures/auth.fixture';
import { API_URL } from '../env';

const LEGAL_PAGES = [
  { path: '/privacy', testId: 'legal-privacy-page', title: 'Politique de confidentialité' },
  { path: '/terms', testId: 'legal-terms-page', title: 'Conditions d’utilisation' },
  {
    path: '/subscription-terms',
    testId: 'legal-subscription-terms-page',
    title: 'Conditions d’abonnement',
  },
  {
    path: '/refund-policy',
    testId: 'legal-refund-policy-page',
    title: 'Politique de remboursement',
  },
  { path: '/cookie-policy', testId: 'legal-cookie-policy-page', title: 'Politique cookies' },
  { path: '/legal-notice', testId: 'legal-notice-page', title: 'Mentions légales' },
] as const;

const posthogConfigured = (process.env.NEXT_PUBLIC_POSTHOG_KEY ?? '').startsWith('phc_');
/** Same switch as playwright.config.ts: CI serves `next start`, local runs use `next dev`. */
const productionBuild = process.env.CI === 'true' || process.env.CI === '1';

async function phCookies(page: import('@playwright/test').Page) {
  return (await page.context().cookies()).filter((c) => c.name.startsWith('ph_'));
}

test.describe('legal pages', () => {
  for (const legal of LEGAL_PAGES) {
    test(`${legal.path} is public and complete`, async ({ page }) => {
      const response = await page.goto(legal.path);
      expect(response?.status()).toBe(200);
      await expect(page.getByTestId(legal.testId)).toBeVisible();
      await expect(page.getByRole('heading', { level: 1, name: legal.title })).toBeVisible();
      await expect(page.getByText(/Dernière mise à jour/)).toBeVisible();
    });
  }

  test('missing operator details are shown, never hidden', async ({ page }) => {
    await page.goto('/legal-notice');
    await expect(page.getByTestId('legal-draft-notice')).toBeVisible();
    await expect(page.getByText('[à compléter : raison sociale]')).toBeVisible();
  });

  test('the footer links every legal page', async ({ page }) => {
    for (const legal of LEGAL_PAGES) {
      await page.goto('/');
      const footer = page.getByRole('contentinfo');
      await footer.locator(`a[href="${legal.path}"]`).click();
      await expect(page).toHaveURL(new RegExp(`${legal.path}$`));
      await expect(page.getByTestId(legal.testId)).toBeVisible();
    }
  });

  test('legal pages fit a phone screen', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 740 });
    for (const legal of LEGAL_PAGES) {
      await page.goto(legal.path);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth
      );
      expect(overflow, `${legal.path} scrolls horizontally`).toBeLessThanOrEqual(0);
    }
  });

  test('sign-up does not pre-check the terms and links the documents', async ({ page }) => {
    await page.goto('/register');
    await expect(page.locator('#acceptedTerms')).not.toBeChecked();
    await expect(page.locator('label[for="acceptedTerms"] a[href="/terms"]')).toBeVisible();
    await expect(
      page.getByTestId('register-privacy-notice').locator('a[href="/privacy"]')
    ).toBeVisible();
  });

  test('pricing states renewal and links the subscription documents', async ({ page }) => {
    await page.goto('/pricing');
    await expect(page.locator('a[href="/subscription-terms"]').first()).toBeVisible();
    await expect(page.locator('a[href="/refund-policy"]').first()).toBeVisible();
  });
});

test.describe('cookie consent', () => {
  test('preferences open from the footer and a refusal is remembered', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('contentinfo').getByTestId('cookie-preferences-link').click();
    const dialog = page.getByTestId('cookie-consent');
    await expect(dialog).toBeVisible();
    await expect(page.getByTestId('cookie-consent-analytics')).not.toBeChecked();

    await page.getByTestId('cookie-consent-refuse').click();
    await expect(dialog).toBeHidden();
    const stored = await page.evaluate(() => ({
      choice: localStorage.getItem('cv_analytics_consent'),
      at: localStorage.getItem('cv_analytics_consent_at'),
    }));
    expect(stored.choice).toBe('denied');
    expect(Number.isNaN(Date.parse(stored.at ?? ''))).toBe(false);

    await page.reload();
    await expect(dialog).toBeHidden();
    expect(await phCookies(page)).toHaveLength(0);
  });

  test('nothing reaches PostHog before consent', async ({ page }) => {
    test.skip(!productionBuild, '`next dev` captures analytics by default for local debugging');
    const posthogRequests: string[] = [];
    page.on('request', (request) => {
      if (/posthog\.com/.test(request.url())) posthogRequests.push(request.url());
    });

    await page.goto('/');
    await page.goto('/pricing');
    expect(posthogRequests).toEqual([]);
    expect(await phCookies(page)).toHaveLength(0);
    const sessionId = await page.evaluate(() => sessionStorage.getItem('cv_sid'));
    expect(sessionId).toBeNull();
  });

  test('accepting then withdrawing consent removes PostHog storage', async ({ page }) => {
    test.skip(
      !posthogConfigured || !productionBuild,
      'needs a production build with NEXT_PUBLIC_POSTHOG_KEY set'
    );
    // Keep test traffic away from the real project.
    await page.route(/posthog\.com/, (route) => route.fulfill({ status: 200, body: '{}' }));

    await page.goto('/');
    await expect(page.getByTestId('cookie-consent')).toBeVisible();
    await page.getByTestId('cookie-consent-accept').click();
    await expect.poll(async () => (await phCookies(page)).length).toBeGreaterThan(0);

    await page.getByRole('contentinfo').getByTestId('cookie-preferences-link').click();
    await page.getByTestId('cookie-consent-refuse').click();
    await expect.poll(async () => (await phCookies(page)).length).toBe(0);
  });
});

test.describe('privacy settings', () => {
  test('downloads a copy of the account data', async ({ page, testUser }) => {
    await loginAs(page, testUser);
    await page.goto('/account/settings?tab=privacy');
    await expect(page.getByTestId('privacy-settings')).toBeVisible();

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByTestId('privacy-export').click(),
    ]);
    const exported = JSON.parse(await readFile((await download.path())!, 'utf8')) as {
      user: { email: string; passwordHash?: unknown };
      notIncluded: string[];
    };
    expect(exported.user.email).toBe(testUser.email);
    expect(exported.user).not.toHaveProperty('passwordHash');
    expect(exported.notIncluded.length).toBeGreaterThan(0);
  });

  test('deletes the account only with the right password', async ({ page, request, testUser }) => {
    await loginAs(page, testUser);
    await page.goto('/account/settings?tab=privacy');

    await page.getByTestId('privacy-delete-start').click();
    await page.getByTestId('privacy-delete-confirmation').fill('not-the-password');
    await page.getByTestId('privacy-delete-confirm').click();
    await expect(page.getByText('Mot de passe incorrect.')).toBeVisible();

    await page.getByTestId('privacy-delete-confirmation').fill(testUser.password);
    await page.getByTestId('privacy-delete-confirm').click();
    await page.waitForURL((url) => url.pathname === '/');

    const login = await request.post(`${API_URL}/auth/login`, {
      data: { email: testUser.email, password: testUser.password },
    });
    expect(login.ok()).toBe(false);
  });
});

test.describe('account API', () => {
  test('deletion and export need a session', async ({ request }) => {
    const exported = await request.get(`${API_URL}/users/me/export`);
    expect(exported.status()).toBe(401);
    const deleted = await request.delete(`${API_URL}/users/me`, { data: { password: 'x' } });
    expect(deleted.status()).toBe(401);
  });
});

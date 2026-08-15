import { test, expect } from '../fixtures/auth.fixture';
import { mockPdfExport } from '../utils/wait-helpers';
import { expectSubscriptionTier } from '../utils/assertions';

/**
 * AC 1–8: login → create CV → export PDF → pricing → upgrade Pro → checkout → verify plan.
 * Default: Stripe `dev_bypass` (no live keys). Hosted Checkout is `@stripe`.
 */
test.describe('Full payment flow (Free → Pro)', () => {
  test('login, create CV, export PDF, upgrade to Pro @payment @ac', async ({
    page,
    request,
    testUser,
    loginPage,
    dashboardPage,
    editorPage,
    pricingPage,
    billingPage,
  }) => {
    await loginPage.goto();
    await expect(page.getByTestId('login-email')).toBeVisible();
    await loginPage.login(testUser.email, testUser.password);
    await dashboardPage.expectLoaded(testUser.firstName);

    await mockPdfExport(page);
    await dashboardPage.createCv();
    await editorPage.expectLoaded();
    await editorPage.fillIdentity('Ada Lovelace', testUser.email);
    await editorPage.exportPdf();

    await page.goto('/dashboard');
    await dashboardPage.expectCvListed('Nouveau CV');

    await pricingPage.goto();
    await pricingPage.expectPlans();

    await billingPage.goto();
    await billingPage.expectPlan('free');
    await billingPage.startProCheckout();
    await billingPage.waitForCheckoutReturn();

    await billingPage.goto();
    await billingPage.expectPlan('pro');
    await expect(page.getByTestId('plan-badge').first()).toContainText(/pro/i);

    await expectSubscriptionTier(request, testUser.accessToken, 'pro');
  });

  test('login with wrong password stays on login @auth', async ({ page, loginPage, testUser }) => {
    await loginPage.goto();
    await loginPage.login(testUser.email, 'WrongPass1');
    await expect(page.getByTestId('login-error')).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });
});

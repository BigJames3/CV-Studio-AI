import { test, expect } from '../fixtures/auth.fixture';
import { mockPdfExport } from '../utils/wait-helpers';
import { expectSubscriptionTier } from '../utils/assertions';
import { stripeEnabled } from '../env';

/**
 * AC 1–8: login → create CV → export PDF → billing.
 * Pro upgrade requires Stripe test keys (`E2E_STRIPE=1`). There is no checkout bypass.
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

    await dashboardPage.createCv();
    await editorPage.expectLoaded();
    await editorPage.fillIdentity('Ada Lovelace', testUser.email);

    await page.goto('/dashboard');
    await dashboardPage.expectCvListed('Nouveau CV');

    await pricingPage.goto();
    await pricingPage.expectPlans();

    await billingPage.goto();
    await billingPage.expectPlan('free');
    await billingPage.startProCheckout();

    if (!stripeEnabled) {
      await expect(page.getByTestId('checkout-error')).toBeVisible({ timeout: 15_000 });
      await billingPage.expectPlan('free');
    } else {
      await billingPage.waitForCheckoutReturn();
      await billingPage.goto();
      await billingPage.expectPlan('pro');
      await expect(page.getByTestId('plan-badge').first()).toContainText(/pro/i);
      await expectSubscriptionTier(request, testUser.accessToken, 'pro');
    }

    await mockPdfExport(page);
    await page.goto('/dashboard');
    await dashboardPage.expectCvListed('Nouveau CV');
    await page.getByRole('link', { name: 'Éditer' }).first().click();
    await editorPage.expectLoaded();
    await editorPage.exportPdf();
  });

  test('login with wrong password stays on login @auth', async ({ page, loginPage, testUser }) => {
    await loginPage.goto();
    await loginPage.login(testUser.email, 'WrongPass1');
    await expect(page.getByTestId('login-error')).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });
});

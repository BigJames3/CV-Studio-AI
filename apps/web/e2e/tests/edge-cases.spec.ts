import { test, expect, loginAs } from '../fixtures/auth.fixture';

test.describe('Edge cases', () => {
  test('checkout API error stays on billing and shows alert @edge @payment', async ({
    page,
    testUser,
    billingPage,
  }) => {
    await loginAs(page, testUser);
    await page.route('**/api/v1/subscriptions/checkout', async (route) => {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: { code: 'CHECKOUT_FAILED', message: 'Payment failed' },
        }),
      });
    });
    await billingPage.goto();
    await billingPage.startProCheckout();
    await expect(page.getByTestId('checkout-error')).toBeVisible();
    await expect(page).toHaveURL(/account\/billing/);
    await expect(page).not.toHaveURL(/checkout\.stripe\.com/);
  });

  test('unauthenticated billing redirects to login @auth', async ({ page }) => {
    await page.goto('/account/billing');
    await expect(page).toHaveURL(/\/login/);
  });

  test('pricing is public and lists three plans @pricing', async ({ pricingPage }) => {
    await pricingPage.goto();
    await pricingPage.expectPlans();
  });
});

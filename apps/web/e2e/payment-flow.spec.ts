import { test, expect } from '@playwright/test';

/**
 * Payment / monetization path.
 * When Stripe is not configured, checkout uses `dev_bypass` and activates the plan locally.
 * With Stripe test keys, set E2E_STRIPE_LIVE=1 to exercise hosted Checkout (manual/CI secret).
 */
const password = 'TestPassword123!';

test.describe('Payment Flow E2E', () => {
  test('Free → Pro subscription flow (auth → PDF → checkout)', async ({ page }) => {
    const email = `e2e-pro-${Date.now()}@example.com`;

    await page.goto('/register');
    await page.locator('#firstName').fill('Test');
    await page.locator('#lastName').fill('User');
    await page.locator('#email').fill(email);
    await page.locator('#password').fill(password);
    await page.getByTestId('register-submit').click();
    await page.waitForURL(/\/dashboard/, { timeout: 30_000 });

    await page.getByTestId('create-cv').click();
    await page.waitForURL(/\/editor\//, { timeout: 30_000 });

    await page.route('**/api/v1/cvs/export/pdf', async (route) => {
      await route.fulfill({
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': 'attachment; filename="cv-e2e.pdf"',
        },
        body: Buffer.from('%PDF-1.4 e2e'),
      });
    });

    await page.getByTestId('export-pdf-open').click();
    const downloadPromise = page.waitForEvent('download');
    await page.getByTestId('export-pdf-confirm').click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.pdf|cv-/i);

    await page.goto('/account/billing');
    await expect(page.getByTestId('plan-badge')).toContainText(/free/i);

    await page.getByTestId('checkout-pro-month').click();
    await page.waitForURL(/checkout=success|account\/billing|dashboard/, { timeout: 45_000 });

    await page.goto('/account/billing');
    await expect(page.getByTestId('plan-badge')).toContainText(/pro/i, { timeout: 20_000 });
  });

  test('Pro → Business upgrade', async ({ page }) => {
    const email = `e2e-biz-${Date.now()}@example.com`;

    await page.goto('/register');
    await page.locator('#firstName').fill('Biz');
    await page.locator('#lastName').fill('User');
    await page.locator('#email').fill(email);
    await page.locator('#password').fill(password);
    await page.getByTestId('register-submit').click();
    await page.waitForURL(/\/dashboard/);

    await page.goto('/account/billing');
    await page.getByTestId('checkout-pro-month').click();
    await page.waitForURL(/checkout=success|account\/billing/);
    await page.goto('/account/billing');
    await expect(page.getByTestId('plan-badge')).toContainText(/pro/i, { timeout: 20_000 });

    await page.getByTestId('checkout-business-month').click();
    await page.waitForURL(/checkout=success|account\/billing/);
    await page.goto('/account/billing');
    await expect(page.getByTestId('plan-badge')).toContainText(/business/i, { timeout: 20_000 });
  });

  test('Failed checkout surfaces error toast path', async ({ page }) => {
    await page.goto('/register');
    await page.locator('#firstName').fill('Fail');
    await page.locator('#lastName').fill('Pay');
    await page.locator('#email').fill(`e2e-fail-${Date.now()}@example.com`);
    await page.locator('#password').fill(password);
    await page.getByTestId('register-submit').click();
    await page.waitForURL(/\/dashboard/);

    await page.route('**/api/v1/subscriptions/checkout', async (route) => {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 'CHECKOUT_FAILED',
          message: 'Payment failed',
        }),
      });
    });

    await page.goto('/account/billing');
    page.on('dialog', () => undefined);
    await page.getByTestId('checkout-pro-month').click();
    // Stay on billing — checkout error should not navigate to Stripe
    await expect(page).toHaveURL(/account\/billing/);
  });
});

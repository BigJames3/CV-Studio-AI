import { test, expect, loginAs } from '../fixtures/auth.fixture';

test.describe('Billing payment methods', () => {
  test('shows Stripe and CinetPay options @payment', async ({ page, testUser, billingPage }) => {
    await loginAs(page, testUser);
    await billingPage.goto();

    await expect(page.getByTestId('payment-method-selector')).toBeVisible();
    await expect(page.getByTestId('payment-method-stripe')).toBeVisible();
    await expect(page.getByTestId('payment-method-cinetpay')).toBeVisible();
    await expect(page.getByLabel(/Stripe \(carte bancaire\)/)).toBeVisible();
    await expect(page.getByLabel(/CinetPay \(Mobile Money\)/)).toBeVisible();
  });

  test('shows activation-in-progress banner for ?checkout=success while still free @payment', async ({
    page,
    testUser,
    billingPage,
  }) => {
    await loginAs(page, testUser);
    await page.goto('/account/billing?checkout=success');
    await expect(page.getByTestId('billing-page')).toBeVisible();
    await expect(page.getByTestId('checkout-success-banner')).toBeVisible();
    await expect(page.getByText(/Paiement reçu|Activation en cours/)).toBeVisible();
    await billingPage.expectPlan('free');
  });

  test('polls until plan updates after checkout success @payment', async ({ page, testUser }) => {
    await loginAs(page, testUser);

    let grantPro = false;
    await page.route('**/api/v1/subscriptions/me**', async (route) => {
      const tier = grantPro ? 'pro' : 'free';
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            subscription:
              tier === 'pro'
                ? {
                    status: 'active',
                    cancelAtPeriodEnd: false,
                    currentPeriodEnd: new Date().toISOString(),
                    currentPeriodStart: new Date().toISOString(),
                  }
                : null,
            tier,
            entitlements: {
              cvCreate: true,
              aiOptimize: tier !== 'free',
              exportDocx: false,
            },
          },
        }),
      });
    });

    await page.goto('/account/billing?checkout=success');
    await expect(page.getByTestId('checkout-success-banner')).toBeVisible();
    await expect(page.getByTestId('checkout-activation-status')).toContainText(
      /Activation en cours/
    );
    await expect(page.getByTestId('plan-badge')).toContainText(/free/i);

    grantPro = true;
    await expect(page.getByTestId('plan-badge')).toContainText(/pro/i, { timeout: 15_000 });
    await expect(page.getByText(/Abonnement activé/)).toBeVisible();
  });

  test('shows cancel and failed banners from query params @payment', async ({ page, testUser }) => {
    await loginAs(page, testUser);

    await page.goto('/account/billing?checkout=cancel');
    await expect(page.getByTestId('checkout-cancel-banner')).toBeVisible();

    await page.goto('/account/billing?checkout=failed');
    await expect(page.getByTestId('checkout-failed-banner')).toBeVisible();

    await page.goto('/account/billing?checkout=failed&error=timeout');
    await expect(page.getByText(/expiré/)).toBeVisible();
  });

  test('polls payment status while ?checkout=pending @payment', async ({ page, testUser }) => {
    await loginAs(page, testUser);

    await page.route('**/api/v1/payments/status/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            status: 'pending',
            paymentMethod: 'cinetpay',
            transactionId: 'cv_test_123',
          },
        }),
      });
    });

    const pendingRequest = page.waitForRequest((req) => req.url().includes('/payments/status/'));
    await page.goto('/account/billing?checkout=pending&provider=cinetpay&tx=cv_test_123');
    await expect(page.getByTestId('checkout-pending-banner')).toBeVisible();
    await expect(page.getByText(/Confirmation du paiement en cours/)).toBeVisible();
    await pendingRequest;
  });

  test('redirects to success when pending payment completes @payment', async ({
    page,
    testUser,
  }) => {
    await loginAs(page, testUser);
    await page.route('**/api/v1/payments/status/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            status: 'completed',
            paymentMethod: 'cinetpay',
            transactionId: 'cv_test_ok',
          },
        }),
      });
    });

    await page.goto('/account/billing?checkout=pending&provider=cinetpay&tx=cv_test_ok');
    await expect(page).toHaveURL(/checkout=success/, { timeout: 15_000 });
    await expect(page.getByTestId('checkout-success-banner')).toBeVisible();
  });

  test('redirects to failed when pending payment is refused @payment', async ({
    page,
    testUser,
  }) => {
    await loginAs(page, testUser);
    await page.route('**/api/v1/payments/status/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            status: 'failed',
            paymentMethod: 'cinetpay',
            transactionId: 'cv_test_fail',
          },
        }),
      });
    });

    await page.goto('/account/billing?checkout=pending&provider=cinetpay&tx=cv_test_fail');
    await expect(page).toHaveURL(/checkout=failed/, { timeout: 15_000 });
    await expect(page.getByTestId('checkout-failed-banner')).toBeVisible();
  });

  test('sends paymentMethod=cinetpay on checkout @payment', async ({
    page,
    testUser,
    billingPage,
  }) => {
    await loginAs(page, testUser);
    await billingPage.goto();

    const checkoutBody = new Promise<Record<string, unknown>>((resolve) => {
      void page.route('**/api/v1/subscriptions/checkout', async (route) => {
        resolve((route.request().postDataJSON() as Record<string, unknown>) ?? {});
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              url: 'https://checkout.cinetpay.com/payment/tok_test',
              paymentMethod: 'cinetpay',
              transactionId: 'cv_e2e_1',
            },
          }),
        });
      });
    });

    await page.getByTestId('payment-method-cinetpay').click();
    await billingPage.startProCheckout();
    await expect.poll(async () => (await checkoutBody).paymentMethod).toBe('cinetpay');
  });
});

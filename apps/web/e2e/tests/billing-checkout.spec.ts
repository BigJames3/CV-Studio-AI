import { test, expect, loginAs } from '../fixtures/auth.fixture';

test.describe('Billing checkout (Stripe only)', () => {
  test('pays by card through Stripe, with no payment method choice @payment', async ({
    page,
    testUser,
    billingPage,
  }) => {
    await loginAs(page, testUser);
    await billingPage.goto();

    await expect(page.getByTestId('payment-provider-note')).toContainText(/Stripe/);
    await expect(page.getByTestId('payment-method-selector')).toHaveCount(0);
    await expect(page.getByText(/CinetPay|Mobile Money/)).toHaveCount(0);
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
    await expect(page.getByTestId('checkout-success-banner')).toContainText(
      /Paiement reçu|Activation en cours/
    );
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
    // The top bar also renders a plan-badge; assert the billing page one.
    const planBadge = page.getByTestId('billing-page').getByTestId('plan-badge');
    await expect(planBadge).toContainText(/free/i);

    grantPro = true;
    await expect(planBadge).toContainText(/pro/i, { timeout: 15_000 });
    await expect(page.getByText(/Abonnement activé/)).toBeVisible();
  });

  test('shows the cancel banner from query params @payment', async ({ page, testUser }) => {
    await loginAs(page, testUser);

    await page.goto('/account/billing?checkout=cancel');
    await expect(page.getByTestId('checkout-cancel-banner')).toBeVisible();
  });

  test('sends only plan and interval on checkout @payment', async ({
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
              url: 'https://checkout.stripe.com/c/pay/cs_e2e_1',
            },
          }),
        });
      });
    });

    await billingPage.startProCheckout();
    await expect.poll(async () => await checkoutBody).toEqual({ plan: 'pro', interval: 'month' });
  });
});

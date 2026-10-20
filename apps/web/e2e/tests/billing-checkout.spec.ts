import { test, expect, loginAs } from '../fixtures/auth.fixture';
import { grantPlan } from '../utils/db';

test.describe('Billing checkout (Paystack, prepaid periods)', () => {
  test('pays through Paystack, with no payment method choice on our side @payment', async ({
    page,
    testUser,
    billingPage,
  }) => {
    await loginAs(page, testUser);
    await billingPage.goto();

    // Mobile Money or card is chosen on Paystack's page, not here.
    await expect(page.getByTestId('payment-provider-note')).toContainText(/Paystack/);
    await expect(page.getByTestId('payment-provider-note')).toContainText(/Mobile Money/);
    await expect(page.getByTestId('payment-method-selector')).toHaveCount(0);
    await expect(page.getByText(/CinetPay|Stripe/)).toHaveCount(0);
    // Prepaid: no free trial, no billing portal.
    await expect(page.getByTestId('billing-portal')).toHaveCount(0);
    await expect(page.getByText(/jours gratuits/)).toHaveCount(0);
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

  test('confirms the Paystack reference from the return URL @payment', async ({
    page,
    testUser,
  }) => {
    await loginAs(page, testUser);

    const confirmBody = new Promise<Record<string, unknown>>((resolve) => {
      void page.route('**/api/v1/payments/checkout/confirm', async (route) => {
        resolve((route.request().postDataJSON() as Record<string, unknown>) ?? {});
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: { confirmed: false } }),
        });
      });
    });

    await page.goto('/account/billing?checkout=success&trxref=sub_e2e_ref&reference=sub_e2e_ref');
    await expect(page.getByTestId('checkout-success-banner')).toBeVisible();
    await expect.poll(async () => await confirmBody).toEqual({ reference: 'sub_e2e_ref' });
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
              url: 'https://checkout.paystack.com/e2e_1',
              reference: 'sub_e2e_1',
              plan: 'pro',
              interval: 'month',
              amount: 660000,
              currency: 'XOF',
            },
          }),
        });
      });
    });

    await billingPage.startProCheckout();
    await expect.poll(async () => await checkoutBody).toEqual({ plan: 'pro', interval: 'month' });
  });

  test('a prepaid Paystack plan shows its end date and renews through checkout @payment', async ({
    page,
    testUser,
    billingPage,
  }) => {
    // The plan shown comes from the user's tier; the period details from the mocked subscription.
    await grantPlan(testUser.id, 'pro');
    await loginAs(page, testUser);
    const periodEnd = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
    await page.route('**/api/v1/subscriptions/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            subscription: {
              status: 'active',
              provider: 'paystack',
              cancelAtPeriodEnd: false,
              currentPeriodEnd: periodEnd.toISOString(),
              currentPeriodStart: new Date().toISOString(),
            },
            tier: 'pro',
            entitlements: { cvCreate: true, aiOptimize: true, exportDocx: false },
          },
        }),
      });
    });
    const checkoutBody = new Promise<Record<string, unknown>>((resolve) => {
      void page.route('**/api/v1/subscriptions/checkout', async (route) => {
        resolve((route.request().postDataJSON() as Record<string, unknown>) ?? {});
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: { url: '/account/billing?checkout=cancel', reference: 'sub_e2e_2' },
          }),
        });
      });
    });

    await billingPage.goto();
    const billing = page.getByTestId('billing-page');
    await expect(billing.getByTestId('plan-period')).toContainText(
      `Valable jusqu’au ${periodEnd.toLocaleDateString('fr-FR')}`
    );
    // Ends within 7 days: the page warns, and nothing will be charged by itself.
    await expect(billing.getByTestId('prepaid-renewal-note')).toContainText(/bientôt/);
    await expect(billing.getByTestId('cancel-subscription')).toHaveCount(0);
    await expect(billing.getByTestId('billing-portal')).toHaveCount(0);

    await billing.getByTestId('billing-period-year').click();
    await billing.getByTestId('renew-pro-year').click();
    await expect.poll(async () => await checkoutBody).toEqual({ plan: 'pro', interval: 'year' });
  });
});

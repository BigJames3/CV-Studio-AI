import { test, expect, loginAs } from '../fixtures/auth.fixture';

test.describe('Billing page - Payment method selection with geolocation', () => {
  test('should always display both Stripe and CinetPay options @payment', async ({
    page,
    testUser,
    billingPage,
  }) => {
    await loginAs(page, testUser);
    await billingPage.goto();

    await expect(page.getByTestId('payment-method-stripe')).toBeVisible();
    await expect(page.getByTestId('payment-method-cinetpay')).toBeVisible();
    await expect(page.getByLabel(/Stripe \(carte bancaire\)/)).toBeVisible();
    await expect(page.getByLabel(/CinetPay \(Mobile Money\)/)).toBeVisible();
  });

  test('should pre-select CinetPay for user in Senegal @payment', async ({
    page,
    testUser,
    billingPage,
  }) => {
    await page.route('**/api/v1/users/me**', async (route) => {
      if (route.request().method() !== 'GET') {
        await route.continue();
        return;
      }
      const response = await route.fetch();
      const json = (await response.json()) as { data?: Record<string, unknown> };
      await route.fulfill({
        response,
        json: { ...json, data: { ...json.data, countryCode: 'SN' } },
      });
    });

    await loginAs(page, testUser);
    await billingPage.goto();

    await expect(page.getByTestId('payment-method-cinetpay').locator('input')).toBeChecked();
    await expect(page.getByTestId('payment-method-reason')).toContainText(/Basé sur votre profil/);
  });

  test('should pre-select Stripe for user in USA @payment', async ({
    page,
    testUser,
    billingPage,
  }) => {
    await page.route('**/api/v1/users/me**', async (route) => {
      if (route.request().method() !== 'GET') {
        await route.continue();
        return;
      }
      const response = await route.fetch();
      const json = (await response.json()) as { data?: Record<string, unknown> };
      await route.fulfill({
        response,
        json: { ...json, data: { ...json.data, countryCode: 'US' } },
      });
    });

    await loginAs(page, testUser);
    await billingPage.goto();

    await expect(page.getByTestId('payment-method-stripe').locator('input')).toBeChecked();
  });

  test('should allow user to override pre-selection @payment', async ({
    page,
    testUser,
    billingPage,
  }) => {
    await loginAs(page, testUser);
    await billingPage.goto();

    const stripe = page.getByTestId('payment-method-stripe').locator('input');
    const cinetpay = page.getByTestId('payment-method-cinetpay').locator('input');

    await expect(stripe).toBeChecked();
    await page.getByTestId('payment-method-cinetpay').click();
    await expect(cinetpay).toBeChecked();
    await expect(stripe).not.toBeChecked();
  });

  test('should show geolocation consent banner on first visit @payment', async ({
    page,
    testUser,
    billingPage,
  }) => {
    await loginAs(page, testUser);
    await billingPage.goto();

    await expect(page.getByTestId('geo-consent-banner')).toBeVisible();
  });

  test('should respect declined geolocation consent @payment', async ({
    page,
    testUser,
    billingPage,
  }) => {
    await page.addInitScript(() => {
      localStorage.setItem('cv_studio_geo_consent', 'false');
    });
    await loginAs(page, testUser);
    await billingPage.goto();

    await expect(page.getByTestId('payment-method-stripe').locator('input')).toBeChecked();
    await expect(page.getByTestId('geo-consent-banner')).toHaveCount(0);
  });

  test('should persist user selection in localStorage @payment', async ({
    page,
    testUser,
    billingPage,
  }) => {
    await loginAs(page, testUser);
    await billingPage.goto();

    await page.getByTestId('payment-method-cinetpay').click();
    await expect
      .poll(() => page.evaluate(() => localStorage.getItem('cv_studio_payment_method')))
      .toBe('cinetpay');

    await page.reload();
    await expect(page.getByTestId('billing-page')).toBeVisible();
    await expect(page.getByTestId('payment-method-cinetpay').locator('input')).toBeChecked();
  });

  test('should handle missing CinetPay configuration gracefully @payment', async ({
    page,
    testUser,
    billingPage,
  }) => {
    await page.route('**/api/v1/payments/methods**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { stripe: true, cinetpay: false, cinetpayFailClosed: true },
        }),
      });
    });

    await loginAs(page, testUser);
    await billingPage.goto();

    await expect(page.getByTestId('payment-method-cinetpay')).toBeVisible();
    await expect(page.getByTestId('payment-method-stripe')).toBeVisible();
    await expect(page.getByTestId('payment-method-cinetpay').locator('input')).toBeDisabled();
    await expect(page.getByTestId('payment-method-stripe').locator('input')).toBeChecked();
    await expect(page.getByText(/Non disponible/)).toBeVisible();
  });

  test('should use IP country after consent @payment', async ({ page, testUser, billingPage }) => {
    await page.addInitScript(() => {
      localStorage.setItem('cv_studio_geo_consent', 'true');
    });
    await page.route('**/api/v1/geo/country**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { country: 'CI', source: 'ip' },
        }),
      });
    });

    await loginAs(page, testUser);
    await billingPage.goto();

    await expect(page.getByTestId('payment-method-cinetpay').locator('input')).toBeChecked();
    await expect(page.getByTestId('payment-method-reason')).toContainText(
      /Optimisé pour votre région/
    );
  });

  test('should apply IP suggestion after accepting the banner @payment', async ({
    page,
    testUser,
    billingPage,
  }) => {
    await page.route('**/api/v1/geo/country**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { country: 'SN', source: 'ip' },
        }),
      });
    });

    await loginAs(page, testUser);
    await billingPage.goto();

    await expect(page.getByTestId('geo-consent-banner')).toBeVisible();
    await expect(page.getByTestId('payment-method-stripe').locator('input')).toBeChecked();

    await page.getByTestId('geo-consent-accept').click();
    await expect(page.getByTestId('geo-consent-banner')).toHaveCount(0);
    await expect(page.getByTestId('payment-method-cinetpay').locator('input')).toBeChecked();
  });
});

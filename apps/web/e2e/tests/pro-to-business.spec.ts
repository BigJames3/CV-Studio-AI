import { test, expect, loginAs } from '../fixtures/auth.fixture';
import { getSubscription } from '../utils/api';
import { grantPlan } from '../utils/db';
import { expectSubscriptionTier } from '../utils/assertions';

test.describe('Business checkout', () => {
  test('a Free user can start a Business checkout @payment', async ({
    page,
    testUser,
    billingPage,
  }) => {
    await loginAs(page, testUser);
    await billingPage.goto();
    await billingPage.expectPlan('free');
    await expect(page.getByTestId('checkout-pro-month')).toBeVisible();
    await expect(page.getByTestId('checkout-business-month')).toBeVisible();
    await expect(page.getByTestId('billing-business-support')).toHaveCount(0);

    await page.getByTestId('billing-period-year').click();
    await expect(page.getByTestId('checkout-business-year')).toBeVisible();
  });

  test('a Pro user upgrades through checkout with plan=business @payment @upgrade', async ({
    page,
    request,
    testUser,
    billingPage,
  }) => {
    await grantPlan(testUser.id, 'pro');
    await expectSubscriptionTier(request, testUser.accessToken, 'pro');

    await loginAs(page, testUser);
    await billingPage.goto();
    await billingPage.expectPlan('pro');
    await expect(page.getByTestId('checkout-pro-month')).toHaveCount(0);

    const checkoutBody = new Promise<Record<string, unknown>>((resolve) => {
      void page.route('**/api/v1/subscriptions/checkout', async (route) => {
        resolve((route.request().postDataJSON() as Record<string, unknown>) ?? {});
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: { url: '/account/billing?checkout=cancel' },
          }),
        });
      });
    });

    await billingPage.startBusinessCheckout();
    await expect
      .poll(async () => await checkoutBody)
      .toEqual({ plan: 'business', interval: 'month' });

    // The mocked checkout never reached Stripe: the plan must not change on the client's word.
    const sub = await getSubscription(request, testUser.accessToken);
    expect(sub.tier).toBe('pro');
  });
});

import { test, expect, loginAs } from '../fixtures/auth.fixture';
import { checkout } from '../utils/api';
import { expectSubscriptionTier } from '../utils/assertions';

test.describe('Free → Pro upgrade', () => {
  test('billing CTA upgrades Free user to Pro @payment @upgrade', async ({
    page,
    request,
    testUser,
    billingPage,
  }) => {
    await loginAs(page, testUser);
    await billingPage.goto();
    await billingPage.expectPlan('free');
    await expect(page.getByTestId('checkout-pro-month')).toBeVisible();
    await billingPage.startProCheckout();
    await billingPage.waitForCheckoutReturn();
    await billingPage.goto();
    await billingPage.expectPlan('pro');
    await expectSubscriptionTier(request, testUser.accessToken, 'pro');
  });

  test('API checkout is idempotent for same plan @payment', async ({ request, testUser }) => {
    const first = await checkout(request, testUser.accessToken, 'pro');
    const second = await checkout(request, testUser.accessToken, 'pro');
    expect(first.url).toBeTruthy();
    expect(second.url).toBeTruthy();
    const sub = await expectSubscriptionTier(request, testUser.accessToken, 'pro');
    expect(sub.subscription).toBeTruthy();
  });
});

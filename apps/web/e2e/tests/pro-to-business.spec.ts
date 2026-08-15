import { test, expect, loginAs } from '../fixtures/auth.fixture';
import { checkout, getSubscription } from '../utils/api';
import { expectSubscriptionTier } from '../utils/assertions';

test.describe('Pro → Business upgrade', () => {
  test('upgrades existing Pro subscription to Business @payment @upgrade', async ({
    page,
    request,
    testUser,
    billingPage,
  }) => {
    await checkout(request, testUser.accessToken, 'pro');
    await expectSubscriptionTier(request, testUser.accessToken, 'pro');

    await loginAs(page, testUser);
    await billingPage.goto();
    await billingPage.expectPlan('pro');
    await expect(page.getByTestId('checkout-pro-month')).toHaveCount(0);
    await billingPage.startBusinessCheckout();
    await billingPage.waitForCheckoutReturn();
    await billingPage.goto();
    await billingPage.expectPlan('business');

    const sub = await expectSubscriptionTier(request, testUser.accessToken, 'business');
    expect(sub.subscription?.status).toMatch(/active|trialing/);
    const again = await getSubscription(request, testUser.accessToken);
    expect(again.tier).toBe('business');
  });
});

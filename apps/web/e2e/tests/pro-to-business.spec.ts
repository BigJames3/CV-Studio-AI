import { test, expect, loginAs } from '../fixtures/auth.fixture';
import { getSubscription } from '../utils/api';
import { grantPlan } from '../utils/db';
import { expectSubscriptionTier } from '../utils/assertions';

test.describe('Pro → Business upgrade', () => {
  test('shows French Business support CTA for Pro users @payment @upgrade', async ({
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
    await billingPage.startBusinessSupport();
    await expect(page.getByTestId('billing-business-support')).toHaveText(/Contactez le support/);
    await expect(page.getByText('Upgrade to Business')).toHaveCount(0);

    const sub = await getSubscription(request, testUser.accessToken);
    expect(sub.tier).toBe('pro');
  });
});

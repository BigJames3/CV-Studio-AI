import { test, expect, loginAs } from '../fixtures/auth.fixture';
import { API_URL } from '../env';
import { apiAuthHeaders } from '../utils/api';
import { expectSubscriptionTier } from '../utils/assertions';

/**
 * Without Stripe, checkout is fail-closed: no plan is ever granted without a
 * verified payment (see docs/PAYMENT_GATEWAY_SETUP.md). The paid upgrade path
 * itself is covered by stripe-checkout.spec.ts (E2E_STRIPE=1).
 */
test.describe('Free → Pro upgrade (Stripe not configured)', () => {
  test('billing CTA shows an error and keeps the user on Free @payment @upgrade', async ({
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

    await expect(page.getByTestId('checkout-error')).toBeVisible();
    await expect(page).toHaveURL(/account\/billing/);
    await billingPage.expectPlan('free');
    await expectSubscriptionTier(request, testUser.accessToken, 'free');
  });

  test('API checkout is refused and never grants a plan @payment', async ({
    request,
    testUser,
  }) => {
    for (let attempt = 0; attempt < 2; attempt++) {
      const res = await request.post(`${API_URL}/subscriptions/checkout`, {
        headers: await apiAuthHeaders(testUser.accessToken),
        data: { plan: 'pro', interval: 'month' },
      });
      expect(res.status()).toBe(400);
      const body = (await res.json()) as { error?: { code?: string } };
      expect(body.error?.code).toBe('STRIPE_NOT_CONFIGURED');
    }
    await expectSubscriptionTier(request, testUser.accessToken, 'free');
  });
});

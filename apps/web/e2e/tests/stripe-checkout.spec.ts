import { test, expect, loginAs } from '../fixtures/auth.fixture';
import { getSubscription } from '../utils/api';
import { STRIPE_CARDS } from '../utils/stripe-test-cards';
import { stripeEnabled } from '../env';

/**
 * Hosted Checkout + webhook sync. Lock / retry / DLQ are covered by
 * apps/api payments.service.spec.ts (P0-1). This file only asserts the
 * user-visible outcome when Stripe test mode is wired.
 */
test.describe('Stripe hosted checkout @stripe', () => {
  test.skip(!stripeEnabled, 'Requires E2E_STRIPE=1, webhook forwarding, and test keys');

  test('4242 card creates an active Pro subscription @stripe @payment', async ({
    page,
    request,
    testUser,
    billingPage,
    stripeCheckoutPage,
  }) => {
    await loginAs(page, testUser);
    await billingPage.goto();
    await billingPage.startProCheckout();
    await stripeCheckoutPage.fillCard(STRIPE_CARDS.success);
    await stripeCheckoutPage.submit();
    await billingPage.waitForCheckoutReturn();

    await expect
      .poll(async () => (await getSubscription(request, testUser.accessToken)).tier, {
        timeout: 45_000,
      })
      .toBe('pro');

    await billingPage.goto();
    await billingPage.expectPlan('pro');
  });
});

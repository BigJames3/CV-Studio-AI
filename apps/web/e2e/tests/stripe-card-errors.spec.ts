import { test, expect, loginAs } from '../fixtures/auth.fixture';
import { STRIPE_CARDS } from '../utils/stripe-test-cards';
import { getSubscription } from '../utils/api';
import { stripeEnabled } from '../env';

test.describe('Stripe card errors', () => {
  test.skip(!stripeEnabled, 'Requires E2E_STRIPE=1 and Stripe test keys');

  test('declined card 4000000000000002 does not create a subscription @stripe @edge', async ({
    page,
    request,
    testUser,
    billingPage,
    stripeCheckoutPage,
  }) => {
    await loginAs(page, testUser);
    await billingPage.goto();
    await billingPage.startProCheckout();
    await stripeCheckoutPage.fillCard(STRIPE_CARDS.declined);
    await stripeCheckoutPage.submit();
    await stripeCheckoutPage.expectDecline();
    const sub = await getSubscription(request, testUser.accessToken);
    expect(sub.tier).toBe('free');
    expect(sub.subscription).toBeNull();
  });

  test('expired card 4000000000000069 stays on checkout @stripe @edge', async ({
    page,
    testUser,
    billingPage,
    stripeCheckoutPage,
  }) => {
    await loginAs(page, testUser);
    await billingPage.goto();
    await billingPage.startProCheckout();
    await stripeCheckoutPage.fillCard(STRIPE_CARDS.expired);
    await stripeCheckoutPage.submit();
    await expect(page).toHaveURL(/checkout\.stripe\.com/);
  });
});

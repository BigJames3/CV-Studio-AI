import { test, expect, loginAs } from '../fixtures/auth.fixture';
import { cancelSubscription, getSubscription } from '../utils/api';
import { grantPlan } from '../utils/db';
import { expectSubscriptionTier } from '../utils/assertions';

test.describe('Downgrade (end of the paid period)', () => {
  test('prepaid Pro has no cancel action and stays active until its end date @payment @downgrade', async ({
    page,
    request,
    testUser,
    billingPage,
  }) => {
    await grantPlan(testUser.id, 'pro');
    await loginAs(page, testUser);
    await billingPage.goto();
    await billingPage.expectPlan('pro');

    const billing = page.getByTestId('billing-page');
    await expect(billing.getByTestId('plan-period')).toContainText(/Valable jusqu’au/);
    await expect(billing.getByTestId('cancel-subscription')).toHaveCount(0);
    await expect(billing.getByTestId('renew-pro-month')).toBeVisible();

    const sub = await getSubscription(request, testUser.accessToken);
    expect(sub.tier).toBe('pro');
    expect(sub.subscription?.cancelAtPeriodEnd).toBe(false);
  });

  test('legacy (pre-Paystack) Pro cancel keeps access and sets cancelAtPeriodEnd @payment @downgrade', async ({
    page,
    request,
    testUser,
    billingPage,
  }) => {
    await grantPlan(testUser.id, 'pro', 'stripe');
    await loginAs(page, testUser);
    await billingPage.goto();
    await billingPage.expectPlan('pro');
    await billingPage.cancelSubscription();

    const sub = await getSubscription(request, testUser.accessToken);
    expect(sub.tier).toBe('pro');
    expect(sub.subscription?.cancelAtPeriodEnd).toBe(true);
    expect(sub.subscription?.status).toMatch(/active|trialing/);
    await expect(page.getByTestId('cancel-pending')).toContainText(/terminera/i);
  });

  test('API cancel is consistent with UI @payment @downgrade', async ({ request, testUser }) => {
    await grantPlan(testUser.id, 'pro');
    const canceled = await cancelSubscription(request, testUser.accessToken);
    expect(canceled.cancelAtPeriodEnd).toBe(true);
    const sub = await expectSubscriptionTier(request, testUser.accessToken, 'pro');
    expect(sub.subscription?.cancelAtPeriodEnd).toBe(true);
  });
});

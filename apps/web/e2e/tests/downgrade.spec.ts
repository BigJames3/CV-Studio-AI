import { test, expect, loginAs } from '../fixtures/auth.fixture';
import { cancelSubscription, checkout, getSubscription } from '../utils/api';
import { expectSubscriptionTier } from '../utils/assertions';

test.describe('Downgrade (cancel at period end)', () => {
  test('Pro cancel keeps access and sets cancelAtPeriodEnd @payment @downgrade', async ({
    page,
    request,
    testUser,
    billingPage,
  }) => {
    await checkout(request, testUser.accessToken, 'pro');
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
    await checkout(request, testUser.accessToken, 'pro');
    const canceled = await cancelSubscription(request, testUser.accessToken);
    expect(canceled.cancelAtPeriodEnd).toBe(true);
    const sub = await expectSubscriptionTier(request, testUser.accessToken, 'pro');
    expect(sub.subscription?.cancelAtPeriodEnd).toBe(true);
  });
});

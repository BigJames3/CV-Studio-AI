import { test, expect, loginAs } from '../fixtures/auth.fixture';
import { checkout, listCvs } from '../utils/api';

test.describe('Plan limits', () => {
  test('Free: second CV opens paywall @limits @paywall', async ({
    page,
    request,
    testUser,
    dashboardPage,
  }) => {
    await loginAs(page, testUser);
    await dashboardPage.createCv();
    await page.goto('/dashboard');
    const afterFirst = await listCvs(request, testUser.accessToken);
    expect(afterFirst.items.length).toBe(1);

    await page.getByTestId('create-cv').click();
    await expect(page.getByTestId('paywall-modal')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('paywall-upgrade')).toBeVisible();
    await page.getByTestId('paywall-upgrade').click();
    await page.waitForURL(/\/account\/billing/);
    await expect(page.getByTestId('checkout-pro-month')).toBeVisible();
  });

  test('Pro: can create a second CV without paywall @limits', async ({
    page,
    request,
    testUser,
    dashboardPage,
  }) => {
    await checkout(request, testUser.accessToken, 'pro');
    await loginAs(page, testUser);
    await dashboardPage.createCv();
    await page.goto('/dashboard');
    await dashboardPage.createCv();
    await page.goto('/dashboard');
    const cvs = await listCvs(request, testUser.accessToken);
    expect(cvs.items.length).toBeGreaterThanOrEqual(2);
    await expect(page.getByTestId('paywall-modal')).toHaveCount(0);
  });

  test('Business: no paywall on extra CVs @limits', async ({
    page,
    request,
    testUser,
    dashboardPage,
  }) => {
    await checkout(request, testUser.accessToken, 'business');
    await loginAs(page, testUser);
    await dashboardPage.createCv();
    await page.goto('/dashboard');
    await dashboardPage.createCv();
    await page.goto('/dashboard');
    const cvs = await listCvs(request, testUser.accessToken);
    expect(cvs.items.length).toBeGreaterThanOrEqual(2);
    await expect(page.getByTestId('paywall-modal')).toHaveCount(0);
  });
});

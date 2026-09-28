import { test, expect, loginAs } from '../fixtures/auth.fixture';
import { createCvs, listCvs } from '../utils/api';
import { grantPlan } from '../utils/db';

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
    await grantPlan(testUser.id, 'pro');
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
    await grantPlan(testUser.id, 'business');
    await loginAs(page, testUser);
    await dashboardPage.createCv();
    await page.goto('/dashboard');
    await dashboardPage.createCv();
    await page.goto('/dashboard');
    const cvs = await listCvs(request, testUser.accessToken);
    expect(cvs.items.length).toBeGreaterThanOrEqual(2);
    await expect(page.getByTestId('paywall-modal')).toHaveCount(0);
  });

  test('Pro at its limit is offered Business, without the trial line @limits @paywall', async ({
    page,
    request,
    testUser,
  }) => {
    await grantPlan(testUser.id, 'pro');
    await createCvs(request, testUser.accessToken, 5);
    await loginAs(page, testUser);
    await page.goto('/dashboard');

    await page.getByTestId('create-cv').click();
    const modal = page.getByTestId('paywall-modal');
    await expect(modal).toBeVisible({ timeout: 15_000 });
    await expect(modal).toContainText('Limite du plan Pro atteinte');
    await expect(modal).toContainText('jusqu’à 20 CV');
    await expect(page.getByTestId('paywall-upgrade')).toHaveText('Passer à Business');
    await expect(modal).not.toContainText('14 jours gratuits');
    await expect(page.getByTestId('paywall-contact-support')).toHaveCount(0);
  });

  test('Business at its limit is sent to support, never to an upgrade @limits @paywall', async ({
    page,
    request,
    testUser,
  }) => {
    await grantPlan(testUser.id, 'business');
    await createCvs(request, testUser.accessToken, 20);
    await loginAs(page, testUser);
    await page.goto('/dashboard');

    await page.getByTestId('create-cv').click();
    const modal = page.getByTestId('paywall-modal');
    await expect(modal).toBeVisible({ timeout: 15_000 });
    await expect(modal).toContainText('Limite du plan Business atteinte');
    await expect(modal).toContainText('20 CV de votre plan Business');
    await expect(page.getByTestId('paywall-upgrade')).toHaveCount(0);
    await expect(modal).not.toContainText('Premium');
    await expect(modal).not.toContainText('14 jours gratuits');

    const support = page.getByTestId('paywall-contact-support');
    await expect(support).toHaveText('Contacter le support');
    const href = decodeURIComponent((await support.getAttribute('href')) ?? '');
    expect(href).toMatch(/^mailto:support@cvstudio\.ai\?/);
    expect(href).toContain('Augmentation du quota de CV (Business)');
    expect(href).toContain('20/20 CV');
    expect(href).toContain(testUser.email);
  });
});

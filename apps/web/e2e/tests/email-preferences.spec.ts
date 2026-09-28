import { test, expect, loginAs } from '../fixtures/auth.fixture';
import { getMe } from '../utils/api';

test.describe('Lifecycle e-mail preferences', () => {
  test('settings turn reminders off and on @emails', async ({ page, request, testUser }) => {
    await loginAs(page, testUser);
    await page.goto('/account/settings');
    await page.getByRole('tab', { name: 'E-mails' }).click();

    const toggle = page.getByTestId('lifecycle-emails-toggle');
    await expect(toggle).toBeChecked();
    await toggle.uncheck();
    await expect
      .poll(
        async () =>
          ((await getMe(request, testUser.accessToken)) as Record<string, unknown>)
            .lifecycleEmailsOptOut
      )
      .toBe(true);

    await toggle.check();
    await expect
      .poll(
        async () =>
          ((await getMe(request, testUser.accessToken)) as Record<string, unknown>)
            .lifecycleEmailsOptOut
      )
      .toBe(false);
  });

  test('an invalid unsubscribe link is refused @emails', async ({ page }) => {
    await page.goto('/desinscription?u=00000000-0000-4000-8000-000000000000&t=forged');
    await page.getByTestId('unsubscribe-confirm').click();
    await expect(page.getByTestId('unsubscribe-error')).toContainText('pas valide');
  });

  test('a link without token is refused without a request @emails', async ({ page }) => {
    await page.goto('/desinscription');
    await expect(page.getByTestId('unsubscribe-error')).toContainText('pas valide');
    await expect(page.getByTestId('unsubscribe-confirm')).toHaveCount(0);
  });
});

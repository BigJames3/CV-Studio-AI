import { test, expect, loginAs } from '../fixtures/auth.fixture';

async function noPageOverflow(page: import('@playwright/test').Page) {
  const overflow = await page.evaluate(() => {
    const root = document.documentElement;
    return {
      scrollWidth: root.scrollWidth,
      clientWidth: root.clientWidth,
    };
  });
  expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth + 1);
}

test.describe('Mobile navigation', () => {
  test('marketing hamburger opens a sheet at 375px', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');

    const trigger = page.getByTestId('marketing-nav-trigger');
    await expect(trigger).toBeVisible();
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await expect(page.getByRole('navigation', { name: 'Navigation principale' })).toBeHidden();

    const box = await trigger.boundingBox();
    expect(box?.width).toBeGreaterThanOrEqual(48);
    expect(box?.height).toBeGreaterThanOrEqual(48);

    await trigger.click();
    const sheet = page.getByTestId('marketing-nav-sheet');
    await expect(sheet).toBeVisible();
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await expect(sheet.getByRole('link', { name: 'Templates' })).toBeVisible();
    await expect(sheet.getByRole('link', { name: 'Pricing' })).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(sheet).toBeHidden();

    await trigger.click();
    await expect(sheet).toBeVisible();
    await page.mouse.click(370, 400);
    await expect(sheet).toBeHidden();

    await noPageOverflow(page);
  });

  test('marketing hamburger hides at 768px', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');
    await expect(page.getByTestId('marketing-nav-trigger')).toBeHidden();
    await expect(page.getByRole('navigation', { name: 'Navigation principale' })).toBeVisible();
    await noPageOverflow(page);
  });

  test('app sheet and 48px avatar menu at 375px', async ({ page, testUser }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await loginAs(page, testUser);

    const hamburger = page.getByTestId('mobile-nav-trigger');
    await expect(hamburger).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Navigation principale' })).toBeHidden();

    await hamburger.click();
    const sheet = page.getByTestId('mobile-nav-sheet');
    await expect(sheet).toBeVisible();
    await expect(page.getByTestId('mobile-nav-dashboard')).toBeVisible();
    await expect(page.getByTestId('mobile-nav-settings')).toBeVisible();
    await expect(page.getByTestId('mobile-nav-logout')).toBeVisible();
    await expect(sheet.getByText(testUser.email)).toBeVisible();

    await page.getByTestId('mobile-nav-settings').click();
    await expect(page).toHaveURL(/\/account\/settings/);
    await expect(sheet).toBeHidden();

    const avatar = page.getByTestId('user-menu-trigger');
    const avatarBox = await avatar.boundingBox();
    expect(avatarBox?.width).toBeGreaterThanOrEqual(48);
    expect(avatarBox?.height).toBeGreaterThanOrEqual(48);

    await avatar.click();
    await expect(page.getByRole('menu')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('menu')).toBeHidden();
    await expect(avatar).toBeFocused();

    await avatar.click();
    await page.mouse.click(10, 400);
    await expect(page.getByRole('menu')).toBeHidden();

    await noPageOverflow(page);
  });

  test('app desktop nav at 768px', async ({ page, testUser }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await loginAs(page, testUser);
    await expect(page.getByTestId('mobile-nav-trigger')).toBeHidden();
    await expect(page.getByRole('navigation', { name: 'Navigation principale' })).toBeVisible();
    await expect(page.getByTestId('user-menu-trigger')).toBeVisible();
    await noPageOverflow(page);
  });
});

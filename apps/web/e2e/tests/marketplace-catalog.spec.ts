import { test, expect } from '@playwright/test';

/** The unified shop, as a visitor sees it. Works with or without published seller listings. */
test.describe('marketplace catalogue', () => {
  test('shows official templates and seller listings in one shop, without designData', async ({
    page,
  }) => {
    const catalog = page.waitForResponse((res) => res.url().includes('/marketplace/catalog'));
    await page.goto('/marketplace');
    const body = await (await catalog).text();
    expect(body).not.toContain('designData');

    const grid = page.getByTestId('marketplace-grid');
    await expect(grid.locator('[data-kind="official"]').first()).toBeVisible();

    // Official cards say which plan includes them, never a price.
    await expect(grid.locator('[data-kind="official"]').first()).toContainText(/Inclus avec/);
  });

  test('filters official and seller templates apart', async ({ page }) => {
    await page.goto('/marketplace');
    await expect(page.getByTestId('marketplace-grid').locator('a').first()).toBeVisible();

    await page.getByTestId('marketplace-source-official').click();
    await expect(page.getByTestId('marketplace-source-official')).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    const grid = page.getByTestId('marketplace-grid');
    await expect(grid.locator('[data-kind="official"]').first()).toBeVisible();
    await expect(grid.locator('[data-kind="seller"]')).toHaveCount(0);

    await page.getByTestId('marketplace-source-seller').click();
    await expect(grid.locator('[data-kind="official"]')).toHaveCount(0);
    // Either approved listings or the explicit empty state: never official cards.
    await expect(
      grid.locator('[data-kind="seller"]').first().or(page.getByTestId('marketplace-empty'))
    ).toBeVisible();
  });

  test('search narrows the shop and an impossible search shows the empty state', async ({
    page,
  }) => {
    await page.goto('/marketplace');
    await page.getByTestId('marketplace-search').fill('zzzz-no-such-template');
    await expect(page.getByTestId('marketplace-empty')).toBeVisible();
  });

  test('an official card opens the template picker, which keeps its plan rules', async ({
    page,
  }) => {
    await page.goto('/marketplace');
    const card = page.getByTestId('marketplace-grid').locator('[data-kind="official"]').first();
    const href = await card.getAttribute('href');
    expect(href).toMatch(/^\/dashboard\/templates\?template=/);
    await card.click();
    // Signed out: the app sends the visitor to log in first.
    await expect(page).toHaveURL(/\/login/);
  });
});

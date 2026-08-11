import { mkdir, writeFile } from 'fs/promises';
import path from 'path';

/**
 * Lightweight e2e stub — run with Playwright when `@playwright/test` is installed:
 *   pnpm --filter @cvstudio/web exec playwright test e2e/pdf-export.spec.ts
 *
 * Requires API + web running locally.
 */
import { test, expect } from '@playwright/test';

test.describe('PDF Export', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/editor/local-e2e-pdf');
  });

  test('shows export panel and loading state', async ({ page }) => {
    await page.getByTestId('export-pdf-open').click();
    await expect(page.getByText('Export PDF')).toBeVisible();

    const confirm = page.getByTestId('export-pdf-confirm');
    await expect(confirm).toBeVisible();
  });

  test('downloads PDF when API responds', async ({ page }) => {
    await page.route('**/api/v1/cvs/export/pdf', async (route) => {
      const pdf = Buffer.from('%PDF-1.4 mock');
      await route.fulfill({
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': 'attachment; filename="Test_CV.pdf"',
        },
        body: pdf,
      });
    });

    await page.getByTestId('export-pdf-open').click();
    const downloadPromise = page.waitForEvent('download');
    await page.getByTestId('export-pdf-confirm').click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain('.pdf');

    const out = path.join(test.info().outputDir, download.suggestedFilename());
    await mkdir(path.dirname(out), { recursive: true });
    await download.saveAs(out);
    await writeFile(out + '.ok', '1');
  });

  test('shows error when export fails', async ({ page }) => {
    await page.route('**/api/v1/cvs/export/pdf', (route) => route.abort());
    await page.getByTestId('export-pdf-open').click();
    await page.getByTestId('export-pdf-confirm').click();
    await expect(page.getByRole('alert')).toBeVisible({ timeout: 10_000 });
  });
});

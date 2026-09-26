import { test, expect, loginAs } from './fixtures/auth.fixture';
import { mkdir } from 'fs/promises';
import path from 'path';

/**
 * PDF export UI contract on the local editor (no API CV required, but a real
 * session: the app shell calls /users/me and a 401 redirects to /login).
 * Full authenticated export is covered by tests/full-payment-flow.spec.ts.
 */
test.describe('PDF Export', () => {
  test.beforeEach(async ({ page, testUser }) => {
    await loginAs(page, testUser);
    await page.goto('/editor/local-e2e-pdf');
  });

  test('shows export panel and loading state', async ({ page }) => {
    await page.getByTestId('export-pdf-open').click();
    await expect(page.getByText('Export PDF')).toBeVisible();
    await expect(page.getByTestId('export-pdf-confirm')).toBeVisible();
  });

  test('downloads PDF when API responds', async ({ page }) => {
    await page.route('**/api/v1/cvs/export/pdf**', async (route) => {
      await route.fulfill({
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': 'attachment; filename="Test_CV.pdf"',
        },
        body: Buffer.from('%PDF-1.4 mock'),
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
  });

  test('shows error when export fails', async ({ page }) => {
    await page.route('**/api/v1/cvs/export/pdf**', (route) => route.abort());
    await page.getByTestId('export-pdf-open').click();
    await page.getByTestId('export-pdf-confirm').click();
    await expect(page.getByRole('alert')).toBeVisible({ timeout: 10_000 });
  });
});

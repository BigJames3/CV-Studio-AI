import { expect, Page } from '@playwright/test';

export async function waitForDashboard(page: Page) {
  await page.waitForURL(/\/dashboard/, { timeout: 30_000 });
  await expect(page.getByTestId('dashboard-page')).toBeVisible({ timeout: 15_000 });
}

export async function mockPdfExport(page: Page) {
  await page.route('**/api/v1/cvs/export/pdf**', async (route) => {
    await route.fulfill({
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="cv-e2e.pdf"',
      },
      body: Buffer.from('%PDF-1.4 e2e-payment-flow'),
    });
  });
}

export async function expectPdfDownload(page: Page, trigger: () => Promise<void>) {
  const downloadPromise = page.waitForEvent('download', { timeout: 30_000 });
  await trigger();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/\.pdf/i);
  const stream = await download.createReadStream();
  expect(stream, 'PDF download stream missing').toBeTruthy();
  const chunks: Buffer[] = [];
  await new Promise<void>((resolve, reject) => {
    stream!.on('data', (c: Buffer) => chunks.push(c));
    stream!.on('end', () => resolve());
    stream!.on('error', reject);
  });
  const buf = Buffer.concat(chunks);
  expect(buf.byteLength).toBeGreaterThan(0);
  expect(buf.subarray(0, 4).toString()).toBe('%PDF');
  return download;
}

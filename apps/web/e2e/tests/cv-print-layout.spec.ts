import { test, expect, loginAs } from '../fixtures/auth.fixture';

/**
 * Print and PDF export keep each template's own page layout (see `lib/templates/page-layout`).
 * Local drafts (`/editor/local-*?template=…`) open any template without a paid plan.
 */
const TEMPLATES = [
  'modern',
  'creative',
  'executive',
  'startup',
  'ats',
  'classic',
  'banner',
  'compact',
  'developer',
  'health',
  'minimal',
  'elegant',
  'timeline',
  'sidebar',
  'infographic',
] as const;

const FULL_BLEED = new Set([
  'modern',
  'sidebar',
  'elegant',
  'health',
  'banner',
  'creative',
  'infographic',
]);

const preview = '[data-testid="cv-editor"] [data-cv-preview]';

test.describe('CV print / PDF layout', () => {
  test('each template prints with its own safe area and page background', async ({
    page,
    testUser,
  }) => {
    await loginAs(page, testUser);

    for (const key of TEMPLATES) {
      await page.emulateMedia({ media: 'screen' });
      await page.goto(`/editor/local-e2e-print-${key}?template=${key}`);
      await expect(page.locator(preview)).toHaveAttribute('data-template', key, {
        timeout: 20_000,
      });
      await expect(page.locator(preview)).toHaveAttribute(
        'data-cv-layout',
        FULL_BLEED.has(key) ? 'full-bleed' : 'document'
      );

      // Screen: the print-only page background stays hidden.
      expect(
        await page
          .locator(`${preview} [data-cv-page-bg]`)
          .evaluate((el) => getComputedStyle(el).display)
      ).toBe('none');

      await page.emulateMedia({ media: 'print' });
      const print = await page.locator(preview).evaluate((root) => {
        const flows = Array.from(root.querySelectorAll<HTMLElement>('[data-cv-flow]'));
        const bg = root.querySelector<HTMLElement>('[data-cv-page-bg]')!;
        return {
          flows: flows.length,
          cloned: flows.every((el) => {
            const s = getComputedStyle(el);
            return (
              (s.getPropertyValue('box-decoration-break') ||
                s.getPropertyValue('-webkit-box-decoration-break')) === 'clone'
            );
          }),
          bgDisplay: getComputedStyle(bg).display,
          bgPosition: getComputedStyle(bg).position,
        };
      });
      expect(print.flows, `${key}: text flow containers`).toBeGreaterThan(0);
      expect(print.cloned, `${key}: padding repeated on every page`).toBe(true);
      expect(print.bgDisplay, `${key}: page background printed`).toBe('block');
      expect(print.bgPosition).toBe('fixed');
    }
  });

  test('PDF export sends self-contained HTML with the template fonts embedded', async ({
    page,
    testUser,
  }) => {
    await loginAs(page, testUser);

    for (const key of ['sidebar', 'classic', 'infographic'] as const) {
      let body: { html?: string; pageSize?: string } | null = null;
      await page.route('**/cvs/export/pdf', async (route) => {
        body = route.request().postDataJSON();
        await route.fulfill({
          status: 200,
          contentType: 'application/pdf',
          headers: { 'Content-Disposition': 'attachment; filename="cv.pdf"' },
          body: '%PDF-1.4\n%%EOF',
        });
      });

      await page.goto(`/editor/local-e2e-export-${key}?template=${key}`);
      await expect(page.locator(preview)).toHaveAttribute('data-template', key, {
        timeout: 20_000,
      });
      await page.getByTestId('export-pdf-open').click();
      await page.getByTestId('export-pdf-confirm').click();
      await expect.poll(() => body?.html ?? '', { timeout: 20_000 }).toContain('data-cv-export');

      const html = body!.html!;
      expect(html).toContain('@page { size: A4; margin: 0; }');
      expect(html).toContain(`data-template="${key}"`);
      // Fonts are embedded: the PDF service blocks every network request but data: URLs.
      expect(html).toMatch(/@font-face[^}]*url\("data:/);
      expect(html).not.toMatch(/url\(["']?(https?:|\/)/);
      expect(html).not.toContain('fonts.googleapis.com');
      // Same paged-media rules as browser print.
      expect(html).toContain('box-decoration-break: clone');
      expect(html.length).toBeLessThan(1_000_000);

      await page.unroute('**/cvs/export/pdf');
    }
  });
});

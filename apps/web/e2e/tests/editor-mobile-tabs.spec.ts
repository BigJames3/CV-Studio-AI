import { test, expect } from '@playwright/test';

const SECTIONS = [
  'identity',
  'summary',
  'experience',
  'education',
  'skills',
  'languages',
  'projects',
  'certificates',
  'references',
] as const;

const FORM_BY_SECTION: Record<(typeof SECTIONS)[number], string> = {
  identity: 'identity-form',
  summary: 'summary-form',
  experience: 'experience-form',
  education: 'education-form',
  skills: 'skills-form',
  languages: 'languages-form',
  projects: 'projects-form',
  certificates: 'certificates-form',
  references: 'references-form',
};

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

async function openLocalEditor(
  context: import('@playwright/test').BrowserContext,
  page: import('@playwright/test').Page
) {
  await context.addCookies([
    {
      name: 'cv_session',
      value: '1',
      url: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000',
    },
  ]);
  await page.goto('/editor/local-e2e-tabs');
  await expect(page.getByTestId('cv-editor')).toBeVisible({ timeout: 20_000 });
  await page.waitForFunction(() => {
    const el =
      document.querySelector('[data-testid="editor-section-identity"]') ||
      document.querySelector('[data-testid="editor-rail-identity"]');
    return !!el && Object.keys(el).some((key) => key.startsWith('__react'));
  });
}

test.describe('Editor mobile section tabs', () => {
  test('all sections reachable at 375px without page overflow', async ({ context, page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await openLocalEditor(context, page);

    const tabs = page.getByTestId('editor-section-tabs');
    await expect(tabs).toBeVisible();
    await expect(page.getByTestId('editor-section-rail')).toBeHidden();
    await expect(page.getByTestId('identity-form')).toBeVisible();

    for (const id of SECTIONS) {
      const tab = page.getByTestId(`editor-section-${id}`);
      await expect(tab).toBeAttached();
      await tab.click();
      await expect(page.getByTestId(FORM_BY_SECTION[id])).toBeVisible();
      await expect(tab).toHaveAttribute('aria-selected', 'true');
      await expect(tab).toHaveAttribute('role', 'tab');
    }

    await page.getByTestId('editor-section-identity').click();
    const nameBox = await page.locator('#fullName').boundingBox();
    expect(nameBox?.height).toBeGreaterThanOrEqual(48);

    await noPageOverflow(page);
  });

  test('tabs hidden and rail visible at 768px', async ({ context, page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await openLocalEditor(context, page);

    await expect(page.getByTestId('editor-section-tabs')).toBeHidden();
    const rail = page.getByTestId('editor-section-rail');
    await expect(rail).toBeVisible();

    await page.getByTestId('editor-rail-skills').click();
    await expect(page.getByTestId('skills-form')).toBeVisible();

    await noPageOverflow(page);
  });

  test('keyboard arrows switch sections at 375px', async ({ context, page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await openLocalEditor(context, page);

    const profileTab = page.getByTestId('editor-section-identity');
    await profileTab.focus();
    await expect(profileTab).toHaveAttribute('aria-selected', 'true');

    await page.keyboard.press('ArrowRight');
    await expect(page.getByTestId('editor-section-summary')).toHaveAttribute(
      'aria-selected',
      'true'
    );
    await expect(page.getByTestId('summary-form')).toBeVisible();

    await page.keyboard.press('End');
    await expect(page.getByTestId('editor-section-references')).toHaveAttribute(
      'aria-selected',
      'true'
    );
    await expect(page.getByTestId('references-form')).toBeVisible();
  });
});

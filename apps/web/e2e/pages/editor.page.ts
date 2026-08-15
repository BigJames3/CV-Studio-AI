import { Page, expect } from '@playwright/test';
import { expectPdfDownload } from '../utils/wait-helpers';

export class EditorPage {
  constructor(private readonly page: Page) {}

  async expectLoaded() {
    await expect(this.page.getByTestId('cv-editor')).toBeVisible({ timeout: 20_000 });
  }

  async fillIdentity(name: string, email: string) {
    await this.page.locator('#fullName').fill(name);
    await this.page.locator('#email').fill(email);
    await expect(this.page.getByTestId('identity-form')).toBeVisible();
  }

  async exportPdf() {
    await this.page.getByTestId('export-pdf-open').click();
    await expect(this.page.getByTestId('export-pdf-confirm')).toBeVisible();
    return expectPdfDownload(this.page, () => this.page.getByTestId('export-pdf-confirm').click());
  }
}

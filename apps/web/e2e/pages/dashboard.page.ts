import { Page, expect } from '@playwright/test';

export class DashboardPage {
  constructor(private readonly page: Page) {}

  async expectLoaded(firstName?: string) {
    await expect(this.page.getByTestId('dashboard-page')).toBeVisible();
    if (firstName) {
      await expect(this.page.getByTestId('welcome')).toContainText(firstName);
    }
  }

  async createCv() {
    await this.page.getByTestId('create-cv').click();
    await this.page.waitForURL(/\/editor\//, { timeout: 30_000 });
  }

  async expectCvListed(title: string) {
    await expect(this.page.getByTestId('cv-card').filter({ hasText: title }).first()).toBeVisible();
  }

  async openUpgrade() {
    await this.page.getByTestId('upgrade-to-pro').click();
    await this.page.waitForURL(/\/account\/billing/);
  }
}

import { Page, expect } from '@playwright/test';

export class PricingPage {
  constructor(private readonly page: Page) {}

  async goto() {
    await this.page.goto('/pricing');
    await expect(this.page.getByTestId('pricing-page')).toBeVisible();
  }

  async expectPlans() {
    await expect(this.page.getByTestId('pricing-plan-free')).toBeVisible();
    await expect(this.page.getByTestId('pricing-plan-pro')).toBeVisible();
    await expect(this.page.getByTestId('pricing-plan-business')).toBeVisible();
    await expect(this.page.getByTestId('pricing-plan-pro')).toContainText(/9,99/);
    await expect(this.page.getByTestId('pricing-plan-business')).toContainText(/29,99/);
  }
}

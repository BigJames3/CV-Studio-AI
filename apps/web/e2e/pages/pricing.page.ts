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
    // XOF prices from the EUR catalog at the fixed parity (fr-FR groups digits with a space).
    await expect(this.page.getByTestId('pricing-plan-pro')).toContainText(/6\s600\sF\sCFA/);
    await expect(this.page.getByTestId('pricing-plan-business')).toContainText(/19\s700\sF\sCFA/);
  }
}

import { Page, expect } from '@playwright/test';
import { expectPlanBadge } from '../utils/assertions';

export class BillingPage {
  constructor(private readonly page: Page) {}

  async goto() {
    await this.page.goto('/account/billing');
    await expect(this.page.getByTestId('billing-page')).toBeVisible({ timeout: 20_000 });
  }

  async expectPlan(plan: 'free' | 'pro' | 'business') {
    await expectPlanBadge(this.page, plan);
  }

  async startProCheckout() {
    await this.page.getByTestId('checkout-pro-month').click();
  }

  async startBusinessCheckout() {
    await this.page.getByTestId('checkout-business-month').click();
  }

  async waitForCheckoutReturn() {
    await this.page.waitForURL(/checkout=success|account\/billing|dashboard/, { timeout: 60_000 });
  }

  async cancelSubscription() {
    await this.page.getByTestId('cancel-subscription').click();
    await expect(this.page.getByTestId('cancel-confirm-modal')).toBeVisible();
    await this.page.getByTestId('cancel-subscription-confirm').click();
    await expect(this.page.getByTestId('cancel-pending')).toBeVisible({ timeout: 15_000 });
  }
}

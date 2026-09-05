import { Page, expect } from '@playwright/test';
import { expectPlanBadge } from '../utils/assertions';

const CATALOG = [
  {
    id: 'free',
    name: 'Gratuit',
    description: '1 CV',
    position: 0,
    priceMonthly: 0,
    priceAnnual: null,
    currency: 'EUR',
    trialDays: null,
    recommended: false,
    entitlements: [{ feature: 'cvLimit', value: '1', included: true }],
  },
  {
    id: 'pro',
    name: 'Pro',
    description: 'Unlimited',
    position: 1,
    priceMonthly: 9.99,
    priceAnnual: 99,
    currency: 'EUR',
    trialDays: 14,
    recommended: true,
    entitlements: [{ feature: 'cvLimit', value: 'unlimited', included: true }],
  },
  {
    id: 'business',
    name: 'Business',
    description: 'Teams',
    position: 2,
    priceMonthly: 29.99,
    priceAnnual: 299,
    currency: 'EUR',
    trialDays: 14,
    recommended: false,
    entitlements: [{ feature: 'apiAccess', value: 'true', included: true }],
  },
];

export class BillingPage {
  constructor(private readonly page: Page) {
    void this.page.route('**/api/v1/plans**', async (route) => {
      if (route.request().method() !== 'GET') {
        await route.continue();
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: CATALOG }),
      });
    });
  }

  async goto() {
    await this.page.goto('/account/billing');
    await expect(this.page.getByTestId('billing-page')).toBeVisible({ timeout: 20_000 });
    await expect(this.page.getByTestId('billing-plan-pro')).toBeVisible({ timeout: 15_000 });
  }

  async expectPlan(plan: 'free' | 'pro' | 'business') {
    await expectPlanBadge(this.page, plan);
  }

  async startProCheckout() {
    await this.page.getByTestId('checkout-pro-month').click();
  }

  async startBusinessSupport() {
    await expect(this.page.getByTestId('billing-business-support')).toBeVisible();
    await expect(this.page.getByTestId('billing-business-support')).toHaveAttribute(
      'href',
      /mailto:support@cvstudio\.ai/
    );
  }

  async startBusinessCheckout() {
    await this.startBusinessSupport();
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

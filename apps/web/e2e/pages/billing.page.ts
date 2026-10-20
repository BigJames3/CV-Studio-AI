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
    currency: 'XOF',
    trialDays: null,
    recommended: false,
    entitlements: [{ feature: 'cvLimit', value: '1', included: true }],
  },
  {
    id: 'pro',
    name: 'Pro',
    description: '5 CVs',
    position: 1,
    priceMonthly: 6600,
    priceAnnual: 65000,
    currency: 'XOF',
    trialDays: null,
    recommended: true,
    entitlements: [{ feature: 'cvLimit', value: '5', included: true }],
  },
  {
    id: 'business',
    name: 'Business',
    description: 'Teams',
    position: 2,
    priceMonthly: 19700,
    priceAnnual: 196200,
    currency: 'XOF',
    trialDays: null,
    recommended: false,
    entitlements: [
      { feature: 'cvLimit', value: '20', included: true },
      { feature: 'apiAccess', value: 'true', included: true },
    ],
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

  async startBusinessCheckout() {
    await this.page.getByTestId('checkout-business-month').click();
  }

  async cancelSubscription() {
    await this.page.getByTestId('cancel-subscription').click();
    await expect(this.page.getByTestId('cancel-confirm-modal')).toBeVisible();
    await this.page.getByTestId('cancel-subscription-confirm').click();
    await expect(this.page.getByTestId('cancel-pending')).toBeVisible({ timeout: 15_000 });
  }
}

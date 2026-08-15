import { test as base, expect } from '@playwright/test';
import { apiLogin, apiRegister, deleteUser, type TestUser } from '../utils/api';
import { LoginPage } from '../pages/login.page';
import { RegisterPage } from '../pages/register.page';
import { DashboardPage } from '../pages/dashboard.page';
import { EditorPage } from '../pages/editor.page';
import { PricingPage } from '../pages/pricing.page';
import { BillingPage } from '../pages/billing.page';
import { StripeCheckoutPage } from '../pages/checkout.page';
import { waitForDashboard } from '../utils/wait-helpers';

type Pages = {
  loginPage: LoginPage;
  registerPage: RegisterPage;
  dashboardPage: DashboardPage;
  editorPage: EditorPage;
  pricingPage: PricingPage;
  billingPage: BillingPage;
  stripeCheckoutPage: StripeCheckoutPage;
};

type AuthFixtures = Pages & {
  testUser: TestUser;
};

export const test = base.extend<AuthFixtures>({
  loginPage: async ({ page }, use) => use(new LoginPage(page)),
  registerPage: async ({ page }, use) => use(new RegisterPage(page)),
  dashboardPage: async ({ page }, use) => use(new DashboardPage(page)),
  editorPage: async ({ page }, use) => use(new EditorPage(page)),
  pricingPage: async ({ page }, use) => use(new PricingPage(page)),
  billingPage: async ({ page }, use) => use(new BillingPage(page)),
  stripeCheckoutPage: async ({ page }, use) => use(new StripeCheckoutPage(page)),

  testUser: async ({ request }, use) => {
    const user = await apiRegister(request);
    await use(user);
    await deleteUser(request, user.accessToken);
  },
});

export { expect };

export async function loginAs(page: import('@playwright/test').Page, user: TestUser) {
  const login = new LoginPage(page);
  await login.goto();
  await login.login(user.email, user.password);
  await waitForDashboard(page);
}

export { apiLogin, apiRegister, waitForDashboard };

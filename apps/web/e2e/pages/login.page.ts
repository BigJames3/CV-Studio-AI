import { Page, expect } from '@playwright/test';

export class LoginPage {
  constructor(private readonly page: Page) {}

  async goto() {
    await this.page.goto('/login');
    await expect(this.page.getByTestId('login-page')).toBeVisible();
  }

  async login(email: string, password: string) {
    await this.page.getByTestId('login-email').fill(email);
    await this.page.getByTestId('login-password').fill(password);
    await this.page.getByTestId('login-submit').click();
  }
}

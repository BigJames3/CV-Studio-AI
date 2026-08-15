import { Page, expect } from '@playwright/test';

export class RegisterPage {
  constructor(private readonly page: Page) {}

  async goto() {
    await this.page.goto('/register');
    await expect(this.page.getByTestId('register-page')).toBeVisible();
  }

  async register(input: { firstName: string; lastName: string; email: string; password: string }) {
    await this.page.locator('#firstName').fill(input.firstName);
    await this.page.locator('#lastName').fill(input.lastName);
    await this.page.locator('#email').fill(input.email);
    await this.page.locator('#password').fill(input.password);
    await this.page.getByTestId('register-submit').click();
  }
}

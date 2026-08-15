import { Page, expect } from '@playwright/test';
import { STRIPE_CARDS, type StripeTestCard } from '../utils/stripe-test-cards';

/**
 * Stripe Hosted Checkout. Selectors follow current Checkout (Payment Element).
 * Tagged tests using this page are skipped unless E2E_STRIPE=1.
 */
export class StripeCheckoutPage {
  constructor(private readonly page: Page) {}

  async expectHosted() {
    await this.page.waitForURL(/checkout\.stripe\.com/, { timeout: 45_000 });
  }

  async fillCard(card: StripeTestCard = STRIPE_CARDS.success) {
    await this.expectHosted();
    const number = this.page
      .getByPlaceholder(/1234|card number/i)
      .or(this.page.getByLabel(/card number/i));
    await number.first().fill(card.number);

    const exp = this.page.getByPlaceholder(/MM\s?\/\s?YY/i).or(this.page.getByLabel(/expir/i));
    await exp.first().fill(card.exp);

    const cvc = this.page.getByPlaceholder(/CVC|CVV/i).or(this.page.getByLabel(/cvc|cvv/i));
    await cvc.first().fill(card.cvc);

    const zip = this.page.getByPlaceholder(/ZIP|Postal/i).or(this.page.getByLabel(/zip|postal/i));
    if (
      await zip
        .first()
        .isVisible()
        .catch(() => false)
    ) {
      await zip.first().fill(card.zip);
    }
  }

  async submit() {
    await this.page.getByRole('button', { name: /pay|subscribe|s’abonner|payer/i }).click();
  }

  async expectDecline() {
    await expect(this.page.getByText(/declined|refus|échoué|failed/i).first()).toBeVisible({
      timeout: 20_000,
    });
  }
}

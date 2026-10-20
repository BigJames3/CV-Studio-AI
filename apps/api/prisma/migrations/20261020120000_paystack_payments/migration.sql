-- Paystack replaces Stripe (Stripe is not available to the merchant's country).
-- Additive only: Stripe columns stay for history and are dropped by a later release.

ALTER TABLE "subscriptions"
ADD COLUMN "paystack_customer_code" VARCHAR(255),
ADD COLUMN "renewal_reminder_sent_at" TIMESTAMPTZ(6);

ALTER TABLE "marketplace_purchases"
ADD COLUMN "paystack_reference" VARCHAR(255);

CREATE UNIQUE INDEX "marketplace_purchases_paystack_reference_key"
ON "marketplace_purchases"("paystack_reference");

ALTER TABLE "seller_profiles"
ADD COLUMN "paystack_subaccount_code" VARCHAR(255),
ADD COLUMN "payout_bank_name" VARCHAR(120),
ADD COLUMN "payout_account_last4" VARCHAR(4);

CREATE UNIQUE INDEX "seller_profiles_paystack_subaccount_code_key"
ON "seller_profiles"("paystack_subaccount_code");

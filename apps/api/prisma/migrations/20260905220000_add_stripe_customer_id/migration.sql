-- Persist Stripe Customer IDs so checkout reuses one customer per user.
-- Existing duplicate Stripe customers are not deleted; next checkout/webhook backfills this column.

ALTER TABLE "subscriptions"
ADD COLUMN "stripe_customer_id" VARCHAR(255);

CREATE UNIQUE INDEX "subscriptions_stripe_customer_id_key"
ON "subscriptions"("stripe_customer_id");

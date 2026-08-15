-- Dual-gateway billing: optional provider fields (safe rollback = DROP COLUMN).
ALTER TABLE "subscriptions" ADD COLUMN "provider" VARCHAR(32);
ALTER TABLE "subscriptions" ADD COLUMN "cinetpay_transaction_id" VARCHAR(255);
ALTER TABLE "subscriptions" ADD COLUMN "last_payment_error" VARCHAR(512);
ALTER TABLE "users" ADD COLUMN "country_code" CHAR(2);

CREATE UNIQUE INDEX "subscriptions_cinetpay_transaction_id_key" ON "subscriptions"("cinetpay_transaction_id");

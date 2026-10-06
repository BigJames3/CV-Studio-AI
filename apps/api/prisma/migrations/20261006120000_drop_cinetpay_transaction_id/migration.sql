-- Contract step after CinetPay removal: the column has been unused since the previous release.
DROP INDEX IF EXISTS "subscriptions_cinetpay_transaction_id_key";
ALTER TABLE "subscriptions" DROP COLUMN IF EXISTS "cinetpay_transaction_id";

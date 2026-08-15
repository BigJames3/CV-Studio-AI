-- CinetPay checkout stores plan/interval on the pending payment (never trust notify body).
ALTER TABLE "payments" ADD COLUMN "metadata" JSONB;

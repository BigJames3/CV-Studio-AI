-- Étape 11: Stripe webhook idempotency + DLQ + unique payment transactionId

CREATE TYPE "StripeWebhookStatus" AS ENUM ('processing', 'processed', 'dlq');

CREATE TABLE "stripe_webhook_events" (
    "id" VARCHAR(255) NOT NULL,
    "type" VARCHAR(128) NOT NULL,
    "status" "StripeWebhookStatus" NOT NULL DEFAULT 'processing',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "last_error" TEXT,
    "payload" JSONB,
    "processed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "stripe_webhook_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "idx_stripe_webhook_events_status" ON "stripe_webhook_events"("status");
CREATE INDEX "idx_stripe_webhook_events_created_at" ON "stripe_webhook_events"("created_at");

CREATE UNIQUE INDEX "payments_transaction_id_key" ON "payments"("transaction_id");

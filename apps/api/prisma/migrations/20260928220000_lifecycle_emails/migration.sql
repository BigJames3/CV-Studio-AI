-- Lifecycle e-mails: opt-out flag (default false: soft opt-in with one-click unsubscribe) and a
-- send log (one row per user and type). Additive: safe while older pods run.
-- AlterTable
ALTER TABLE "users" ADD COLUMN     "lifecycle_emails_opt_out" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "lifecycle_emails" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "type" VARCHAR(40) NOT NULL,
    "sent_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lifecycle_emails_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_lifecycle_emails_user_sent" ON "lifecycle_emails"("user_id", "sent_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "uq_lifecycle_emails_user_type" ON "lifecycle_emails"("user_id", "type");

-- AddForeignKey
ALTER TABLE "lifecycle_emails" ADD CONSTRAINT "lifecycle_emails_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;


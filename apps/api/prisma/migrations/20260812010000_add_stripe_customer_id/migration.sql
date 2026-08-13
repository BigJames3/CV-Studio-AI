-- AlterTable
ALTER TABLE "users" ADD COLUMN "stripe_customer_id" VARCHAR(255);

-- CreateIndex
CREATE UNIQUE INDEX "users_stripe_customer_id_key" ON "users"("stripe_customer_id");

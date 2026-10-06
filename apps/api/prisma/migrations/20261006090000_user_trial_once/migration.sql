-- The 14-day trial is granted once per account. Additive only: no column or row is dropped.
ALTER TABLE "users" ADD COLUMN     "trial_ends_at" TIMESTAMPTZ(6),
ADD COLUMN     "trial_started_at" TIMESTAMPTZ(6),
ADD COLUMN     "trial_stripe_subscription_id" VARCHAR(255),
ADD COLUMN     "trial_used" BOOLEAN NOT NULL DEFAULT false;

-- Backfill, erring on "trial used": no subscription row today does not prove the account never
-- had a trial, so any trace of a past paid subscription counts. Before this release a trial was
-- granted on the first Checkout of a free account, and every completed Checkout leaves at least
-- one of these traces. Customers created by an abandoned Checkout only are checked against
-- their Stripe history at the next Checkout (SubscriptionsService.checkout).
UPDATE "users" AS u
SET "trial_used" = true
WHERE u."subscription_tier" IN ('pro', 'business')
   OR u."subscription_start_date" IS NOT NULL
   OR EXISTS (
     SELECT 1 FROM "subscriptions" AS s
     WHERE s."user_id" = u."id"
       AND (s."stripe_subscription_id" IS NOT NULL
         OR s."status" = 'trialing'
         OR s."cinetpay_transaction_id" IS NOT NULL)
   )
   OR EXISTS (
     SELECT 1 FROM "payments" AS p
     JOIN "subscriptions" AS s ON s."id" = p."subscription_id"
     WHERE s."user_id" = u."id"
   );

-- A trial running right now keeps its Stripe subscription and dates, so its own later webhooks
-- are recognised as the same trial and not ended as a second one.
UPDATE "users" AS u
SET "trial_started_at" = s."current_period_start",
    "trial_ends_at" = s."current_period_end",
    "trial_stripe_subscription_id" = s."stripe_subscription_id"
FROM "subscriptions" AS s
WHERE s."user_id" = u."id"
  AND s."status" = 'trialing'
  AND s."stripe_subscription_id" IS NOT NULL;

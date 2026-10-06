-- Business analytics: one row per public CV visit. Additive only.
-- No IP or user agent is stored; visitor_hash is salted per day.

CREATE TABLE "cv_views" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "cv_id" UUID NOT NULL,
    "viewed_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" VARCHAR(32) NOT NULL,
    "referrer_host" VARCHAR(255),
    "visitor_hash" CHAR(32) NOT NULL,

    CONSTRAINT "cv_views_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "idx_cv_views_cv_viewed" ON "cv_views"("cv_id", "viewed_at" DESC);

ALTER TABLE "cv_views"
ADD CONSTRAINT "cv_views_cv_id_fkey"
FOREIGN KEY ("cv_id") REFERENCES "cvs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

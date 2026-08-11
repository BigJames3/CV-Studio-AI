-- CV Studio AI — Extra indexes, CHECKs, partial indexes
-- Run after Prisma migrate

-- Partial: active CVs per user (hot path list)
CREATE INDEX IF NOT EXISTS pidx_cvs_active_user_updated
  ON cvs (user_id, updated_at DESC)
  WHERE deleted_at IS NULL;

-- Partial: published templates catalog
CREATE INDEX IF NOT EXISTS pidx_templates_published_category_rating
  ON templates (category, rating DESC)
  WHERE is_published = true;

-- Partial: unread notifications
CREATE INDEX IF NOT EXISTS pidx_notifications_unread
  ON notifications (user_id, created_at DESC)
  WHERE is_read = false;

-- Active subscription uniqueness is already user_id UNIQUE on subscriptions;
-- tighten statuses if multiple rows ever allowed:
-- CREATE UNIQUE INDEX uidx_subscriptions_user_active
--   ON subscriptions (user_id)
--   WHERE status IN ('active', 'past_due', 'trialing');

-- JSONB path ops (optional — measure write impact)
-- CREATE INDEX IF NOT EXISTS idx_cvs_content_gin
--   ON cvs USING GIN (content jsonb_path_ops);

-- CHECK constraints
ALTER TABLE templates DROP CONSTRAINT IF EXISTS chk_templates_price_nonneg;
ALTER TABLE templates
  ADD CONSTRAINT chk_templates_price_nonneg CHECK (price IS NULL OR price >= 0);

ALTER TABLE templates DROP CONSTRAINT IF EXISTS chk_templates_rating_range;
ALTER TABLE templates
  ADD CONSTRAINT chk_templates_rating_range CHECK (rating >= 0 AND rating <= 5);

ALTER TABLE marketplace_templates DROP CONSTRAINT IF EXISTS chk_marketplace_price_nonneg;
ALTER TABLE marketplace_templates
  ADD CONSTRAINT chk_marketplace_price_nonneg CHECK (price >= 0);

ALTER TABLE marketplace_templates DROP CONSTRAINT IF EXISTS chk_marketplace_rating_range;
ALTER TABLE marketplace_templates
  ADD CONSTRAINT chk_marketplace_rating_range CHECK (rating >= 0 AND rating <= 5);

ALTER TABLE template_reviews DROP CONSTRAINT IF EXISTS chk_review_rating_range;
ALTER TABLE template_reviews
  ADD CONSTRAINT chk_review_rating_range CHECK (rating >= 1 AND rating <= 5);

ALTER TABLE ats_reports DROP CONSTRAINT IF EXISTS chk_ats_score_range;
ALTER TABLE ats_reports
  ADD CONSTRAINT chk_ats_score_range CHECK (ats_score >= 0 AND ats_score <= 100);

ALTER TABLE experiences DROP CONSTRAINT IF EXISTS chk_experiences_dates;
ALTER TABLE experiences
  ADD CONSTRAINT chk_experiences_dates CHECK (end_date IS NULL OR end_date >= start_date);

ALTER TABLE education DROP CONSTRAINT IF EXISTS chk_education_dates;
ALTER TABLE education
  ADD CONSTRAINT chk_education_dates CHECK (end_date IS NULL OR end_date >= start_date);

ALTER TABLE payments DROP CONSTRAINT IF EXISTS chk_payments_amount_nonneg;
ALTER TABLE payments
  ADD CONSTRAINT chk_payments_amount_nonneg CHECK (amount >= 0);

ALTER TABLE invoices DROP CONSTRAINT IF EXISTS chk_invoices_amount_nonneg;
ALTER TABLE invoices
  ADD CONSTRAINT chk_invoices_amount_nonneg CHECK (amount >= 0);

ALTER TABLE plans DROP CONSTRAINT IF EXISTS chk_plans_prices_nonneg;
ALTER TABLE plans
  ADD CONSTRAINT chk_plans_prices_nonneg CHECK (price_monthly >= 0 AND price_yearly >= 0);

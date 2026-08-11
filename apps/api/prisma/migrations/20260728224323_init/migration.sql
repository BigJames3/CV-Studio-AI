-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "citext";

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- CreateEnum
CREATE TYPE "SubscriptionTier" AS ENUM ('free', 'pro', 'business');

-- CreateEnum
CREATE TYPE "OAuthProvider" AS ENUM ('google', 'linkedin', 'apple');

-- CreateEnum
CREATE TYPE "TemplateCategory" AS ENUM ('modern', 'creative', 'executive', 'startup', 'ats_optimized');

-- CreateEnum
CREATE TYPE "SkillProficiency" AS ENUM ('beginner', 'intermediate', 'advanced', 'expert');

-- CreateEnum
CREATE TYPE "LanguageProficiency" AS ENUM ('elementary', 'limited_working', 'professional', 'full_professional', 'native');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('active', 'canceled', 'suspended', 'past_due', 'trialing');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('pending', 'completed', 'failed', 'refunded');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('draft', 'sent', 'paid', 'void', 'uncollectible');

-- CreateEnum
CREATE TYPE "AiActionType" AS ENUM ('cv_generation', 'resume_optimization', 'cover_letter', 'interview_prep', 'jd_match', 'career_advice');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('email', 'in_app', 'sms');

-- CreateEnum
CREATE TYPE "CollabRole" AS ENUM ('owner', 'editor', 'commenter', 'viewer');

-- CreateEnum
CREATE TYPE "TeamRole" AS ENUM ('owner', 'admin', 'editor', 'viewer');

-- CreateEnum
CREATE TYPE "SellerStatus" AS ENUM ('pending_kyc', 'active', 'rejected', 'suspended');

-- CreateEnum
CREATE TYPE "SellerTier" AS ENUM ('new', 'trusted', 'partner');

-- CreateEnum
CREATE TYPE "ListingStatus" AS ENUM ('draft', 'submitted', 'in_review', 'changes_requested', 'approved', 'published', 'unpublished', 'rejected', 'suspended');

-- CreateEnum
CREATE TYPE "ModerationDecision" AS ENUM ('approve', 'request_changes', 'reject');

-- CreateEnum
CREATE TYPE "DisputeType" AS ENUM ('quality', 'access', 'billing', 'ip');

-- CreateEnum
CREATE TYPE "DisputeStatus" AS ENUM ('open', 'seller_responded', 'under_review', 'resolved_refund', 'resolved_partial', 'resolved_denied', 'closed');

-- CreateEnum
CREATE TYPE "CopyrightClaimStatus" AS ENUM ('received', 'listing_suspended', 'countered', 'resolved_upheld', 'resolved_rejected');

-- CreateEnum
CREATE TYPE "LedgerEntryType" AS ENUM ('charge_gross', 'stripe_fee', 'platform_commission', 'seller_earning', 'reserve_hold', 'reserve_release', 'payout', 'refund_clawback');

-- CreateEnum
CREATE TYPE "PayoutStatus" AS ENUM ('pending', 'in_transit', 'paid', 'failed');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" CITEXT NOT NULL,
    "password_hash" VARCHAR(255),
    "first_name" VARCHAR(120) NOT NULL,
    "last_name" VARCHAR(120) NOT NULL,
    "avatar_url" VARCHAR(2048),
    "phone" VARCHAR(64),
    "location" VARCHAR(255),
    "bio" TEXT,
    "date_of_birth" DATE,
    "subscription_tier" "SubscriptionTier" NOT NULL DEFAULT 'free',
    "subscription_start_date" TIMESTAMPTZ(6),
    "subscription_end_date" TIMESTAMPTZ(6),
    "is_email_verified" BOOLEAN NOT NULL DEFAULT false,
    "is_2fa_enabled" BOOLEAN NOT NULL DEFAULT false,
    "two_factor_secret_encrypted" BYTEA,
    "last_login_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_oauth_accounts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "provider" "OAuthProvider" NOT NULL,
    "provider_id" VARCHAR(255) NOT NULL,
    "access_token_encrypted" BYTEA NOT NULL,
    "refresh_token_encrypted" BYTEA,
    "token_expires_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "user_oauth_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teams" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(200) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_members" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "team_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" "TeamRole" NOT NULL DEFAULT 'editor',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "team_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "templates" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(200) NOT NULL,
    "description" TEXT NOT NULL,
    "category" "TemplateCategory" NOT NULL,
    "preview_image_url" VARCHAR(2048) NOT NULL,
    "is_premium" BOOLEAN NOT NULL DEFAULT false,
    "price" DECIMAL(10,2),
    "design_data" JSONB NOT NULL,
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "download_count" INTEGER NOT NULL DEFAULT 0,
    "rating" DECIMAL(3,2) NOT NULL DEFAULT 0,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cvs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "template_id" UUID,
    "content" JSONB NOT NULL,
    "schema_version" INTEGER NOT NULL DEFAULT 1,
    "is_public" BOOLEAN NOT NULL DEFAULT false,
    "public_url" VARCHAR(255),
    "view_count" INTEGER NOT NULL DEFAULT 0,
    "is_starred" BOOLEAN NOT NULL DEFAULT false,
    "locale" VARCHAR(16) NOT NULL DEFAULT 'fr-FR',
    "paper" VARCHAR(16) NOT NULL DEFAULT 'A4',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "cvs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cv_versions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "cv_id" UUID NOT NULL,
    "version_number" INTEGER NOT NULL,
    "content" JSONB NOT NULL,
    "label" VARCHAR(200),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cv_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "experiences" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "cv_id" UUID NOT NULL,
    "company_name" VARCHAR(200) NOT NULL,
    "job_title" VARCHAR(200) NOT NULL,
    "location" VARCHAR(255),
    "start_date" DATE NOT NULL,
    "end_date" DATE,
    "is_current" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "experiences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "education" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "cv_id" UUID NOT NULL,
    "school_name" VARCHAR(200) NOT NULL,
    "degree" VARCHAR(200) NOT NULL,
    "field_of_study" VARCHAR(200) NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE,
    "is_ongoing" BOOLEAN NOT NULL DEFAULT false,
    "grade" VARCHAR(64),
    "description" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "education_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skills" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "cv_id" UUID NOT NULL,
    "skill_name" VARCHAR(120) NOT NULL,
    "proficiency" "SkillProficiency" NOT NULL DEFAULT 'intermediate',
    "endorsements_count" INTEGER NOT NULL DEFAULT 0,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "skills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "cv_id" UUID NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT NOT NULL,
    "technologies" TEXT[],
    "url" VARCHAR(2048),
    "image_url" VARCHAR(2048),
    "start_date" DATE NOT NULL,
    "end_date" DATE,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "languages" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "cv_id" UUID NOT NULL,
    "language" VARCHAR(120) NOT NULL,
    "proficiency" "LanguageProficiency" NOT NULL DEFAULT 'professional',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "languages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "certificates" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "cv_id" UUID NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "issuer" VARCHAR(200) NOT NULL,
    "issue_date" DATE NOT NULL,
    "expiration_date" DATE,
    "url" VARCHAR(2048),
    "credential_id" VARCHAR(200),
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "certificates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plans" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(64) NOT NULL,
    "description" TEXT NOT NULL,
    "price_monthly" DECIMAL(10,2) NOT NULL,
    "price_yearly" DECIMAL(10,2) NOT NULL,
    "cv_limit" INTEGER NOT NULL,
    "ai_features" BOOLEAN NOT NULL DEFAULT false,
    "priority_support" BOOLEAN NOT NULL DEFAULT false,
    "custom_domain" BOOLEAN NOT NULL DEFAULT false,
    "marketplace_access" BOOLEAN NOT NULL DEFAULT false,
    "api_access" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "plan_id" UUID NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'active',
    "current_period_start" TIMESTAMPTZ(6) NOT NULL,
    "current_period_end" TIMESTAMPTZ(6) NOT NULL,
    "cancel_at_period_end" BOOLEAN NOT NULL DEFAULT false,
    "canceled_at" TIMESTAMPTZ(6),
    "stripe_subscription_id" VARCHAR(255),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "subscription_id" UUID NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" VARCHAR(8) NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'pending',
    "payment_method" VARCHAR(64) NOT NULL,
    "stripe_payment_intent_id" VARCHAR(255),
    "transaction_id" VARCHAR(255),
    "failed_reason" TEXT,
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "subscription_id" UUID NOT NULL,
    "invoice_number" VARCHAR(64) NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" VARCHAR(8) NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'draft',
    "pdf_url" VARCHAR(2048),
    "due_date" DATE NOT NULL,
    "paid_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ats_reports" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "cv_id" UUID NOT NULL,
    "job_description" TEXT,
    "ats_score" DECIMAL(5,2) NOT NULL,
    "missing_keywords" TEXT[],
    "recommendations" JSONB NOT NULL,
    "generated_optimized_cv" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ats_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_histories" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "cv_id" UUID,
    "action_type" "AiActionType" NOT NULL,
    "prompt" TEXT NOT NULL,
    "result" JSONB NOT NULL,
    "tokens_used" INTEGER NOT NULL,
    "cost_usd" DECIMAL(10,6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_histories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analytics_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID,
    "event_type" VARCHAR(128) NOT NULL,
    "event_data" JSONB,
    "session_id" VARCHAR(128),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analytics_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seller_profiles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "display_name" VARCHAR(80) NOT NULL,
    "slug" VARCHAR(80) NOT NULL,
    "bio" VARCHAR(500),
    "avatar_url" VARCHAR(2048),
    "country" VARCHAR(2) NOT NULL,
    "portfolio_url" VARCHAR(2048),
    "status" "SellerStatus" NOT NULL DEFAULT 'pending_kyc',
    "tier" "SellerTier" NOT NULL DEFAULT 'new',
    "stripe_account_id" VARCHAR(255),
    "payouts_enabled" BOOLEAN NOT NULL DEFAULT false,
    "tos_accepted_at" TIMESTAMPTZ(6),
    "ip_strikes" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "seller_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketplace_templates" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "template_id" UUID NOT NULL,
    "seller_id" UUID NOT NULL,
    "seller_profile_id" UUID,
    "title" VARCHAR(120) NOT NULL,
    "slug" VARCHAR(140) NOT NULL,
    "description" TEXT,
    "price_cents" INTEGER NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
    "status" "ListingStatus" NOT NULL DEFAULT 'draft',
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "download_count" INTEGER NOT NULL DEFAULT 0,
    "impression_count" INTEGER NOT NULL DEFAULT 0,
    "rating" DECIMAL(3,2) NOT NULL DEFAULT 0,
    "review_count" INTEGER NOT NULL DEFAULT 0,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "published_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "marketplace_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "listing_moderations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "marketplace_template_id" UUID NOT NULL,
    "decision" "ModerationDecision",
    "reason_code" VARCHAR(64),
    "notes" TEXT,
    "reviewer_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decided_at" TIMESTAMPTZ(6),

    CONSTRAINT "listing_moderations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketplace_purchases" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "listing_id" UUID NOT NULL,
    "buyer_id" UUID NOT NULL,
    "amount_cents" INTEGER NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
    "stripe_payment_intent_id" VARCHAR(255),
    "stripe_fee_cents" INTEGER NOT NULL DEFAULT 0,
    "platform_fee_cents" INTEGER NOT NULL DEFAULT 0,
    "seller_earning_cents" INTEGER NOT NULL DEFAULT 0,
    "refunded_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "marketplace_purchases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketplace_ledger_entries" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "purchase_id" UUID,
    "payout_id" UUID,
    "seller_id" UUID,
    "entry_type" "LedgerEntryType" NOT NULL,
    "amount_cents" INTEGER NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "marketplace_ledger_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seller_payouts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "seller_profile_id" UUID NOT NULL,
    "amount_cents" INTEGER NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
    "status" "PayoutStatus" NOT NULL DEFAULT 'pending',
    "stripe_transfer_id" VARCHAR(255),
    "period_start" TIMESTAMPTZ(6) NOT NULL,
    "period_end" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paid_at" TIMESTAMPTZ(6),

    CONSTRAINT "seller_payouts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "template_reviews" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "marketplace_template_id" UUID NOT NULL,
    "reviewer_id" UUID NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "helpful_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "template_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketplace_disputes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "purchase_id" UUID NOT NULL,
    "listing_id" UUID NOT NULL,
    "buyer_id" UUID NOT NULL,
    "type" "DisputeType" NOT NULL,
    "status" "DisputeStatus" NOT NULL DEFAULT 'open',
    "reason" TEXT NOT NULL,
    "seller_response" TEXT,
    "resolution" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMPTZ(6),

    CONSTRAINT "marketplace_disputes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "copyright_claims" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "listing_id" UUID NOT NULL,
    "claimant_id" UUID,
    "claimant_email" VARCHAR(320) NOT NULL,
    "evidence_url" VARCHAR(2048),
    "description" TEXT NOT NULL,
    "status" "CopyrightClaimStatus" NOT NULL DEFAULT 'received',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMPTZ(6),

    CONSTRAINT "copyright_claims_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "message" TEXT NOT NULL,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "action_url" VARCHAR(2048),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "portfolios" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "items" JSONB NOT NULL,
    "public_url" VARCHAR(255),
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "noindex" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "portfolios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID,
    "entity_type" VARCHAR(64) NOT NULL,
    "entity_id" UUID NOT NULL,
    "action" VARCHAR(32) NOT NULL,
    "old_values" JSONB,
    "new_values" JSONB,
    "ip_address" VARCHAR(64),
    "user_agent" VARCHAR(512),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "collab_sessions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "cv_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" "CollabRole" NOT NULL DEFAULT 'editor',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "collab_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "collab_snapshots" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "cv_id" UUID NOT NULL,
    "created_by_id" UUID,
    "state" BYTEA NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "collab_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "idx_users_subscription_tier" ON "users"("subscription_tier");

-- CreateIndex
CREATE INDEX "idx_users_created_at" ON "users"("created_at");

-- CreateIndex
CREATE INDEX "idx_users_deleted_at" ON "users"("deleted_at");

-- CreateIndex
CREATE INDEX "idx_oauth_user_id" ON "user_oauth_accounts"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "uidx_oauth_provider_provider_id" ON "user_oauth_accounts"("provider", "provider_id");

-- CreateIndex
CREATE INDEX "idx_team_members_user_id" ON "team_members"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "uidx_team_members_team_user" ON "team_members"("team_id", "user_id");

-- CreateIndex
CREATE INDEX "idx_templates_category" ON "templates"("category");

-- CreateIndex
CREATE INDEX "idx_templates_is_premium" ON "templates"("is_premium");

-- CreateIndex
CREATE INDEX "idx_templates_is_published" ON "templates"("is_published");

-- CreateIndex
CREATE INDEX "idx_templates_created_by" ON "templates"("created_by");

-- CreateIndex
CREATE UNIQUE INDEX "cvs_public_url_key" ON "cvs"("public_url");

-- CreateIndex
CREATE INDEX "idx_cvs_user_updated" ON "cvs"("user_id", "updated_at" DESC);

-- CreateIndex
CREATE INDEX "idx_cvs_template_id" ON "cvs"("template_id");

-- CreateIndex
CREATE INDEX "idx_cvs_created_at" ON "cvs"("created_at");

-- CreateIndex
CREATE INDEX "idx_cvs_is_public" ON "cvs"("is_public");

-- CreateIndex
CREATE INDEX "idx_cvs_deleted_at" ON "cvs"("deleted_at");

-- CreateIndex
CREATE INDEX "idx_cv_versions_cv_version" ON "cv_versions"("cv_id", "version_number");

-- CreateIndex
CREATE UNIQUE INDEX "uidx_cv_versions_cv_version" ON "cv_versions"("cv_id", "version_number");

-- CreateIndex
CREATE INDEX "idx_experiences_cv_order" ON "experiences"("cv_id", "sort_order");

-- CreateIndex
CREATE INDEX "idx_education_cv_order" ON "education"("cv_id", "sort_order");

-- CreateIndex
CREATE INDEX "idx_skills_cv_order" ON "skills"("cv_id", "sort_order");

-- CreateIndex
CREATE INDEX "idx_projects_cv_order" ON "projects"("cv_id", "sort_order");

-- CreateIndex
CREATE INDEX "idx_languages_cv_order" ON "languages"("cv_id", "sort_order");

-- CreateIndex
CREATE INDEX "idx_certificates_cv_order" ON "certificates"("cv_id", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "plans_name_key" ON "plans"("name");

-- CreateIndex
CREATE INDEX "idx_plans_is_active" ON "plans"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_user_id_key" ON "subscriptions"("user_id");

-- CreateIndex
CREATE INDEX "idx_subscriptions_status" ON "subscriptions"("status");

-- CreateIndex
CREATE INDEX "idx_subscriptions_period_end" ON "subscriptions"("current_period_end");

-- CreateIndex
CREATE INDEX "idx_subscriptions_stripe" ON "subscriptions"("stripe_subscription_id");

-- CreateIndex
CREATE INDEX "idx_payments_subscription_id" ON "payments"("subscription_id");

-- CreateIndex
CREATE INDEX "idx_payments_status" ON "payments"("status");

-- CreateIndex
CREATE INDEX "idx_payments_created_at" ON "payments"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_invoice_number_key" ON "invoices"("invoice_number");

-- CreateIndex
CREATE INDEX "idx_invoices_subscription_id" ON "invoices"("subscription_id");

-- CreateIndex
CREATE INDEX "idx_invoices_status" ON "invoices"("status");

-- CreateIndex
CREATE INDEX "idx_invoices_created_at" ON "invoices"("created_at");

-- CreateIndex
CREATE INDEX "idx_ats_reports_cv_created" ON "ats_reports"("cv_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_ai_histories_user_created" ON "ai_histories"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_ai_histories_action_type" ON "ai_histories"("action_type");

-- CreateIndex
CREATE INDEX "idx_ai_histories_cv_id" ON "ai_histories"("cv_id");

-- CreateIndex
CREATE INDEX "idx_analytics_user_created" ON "analytics_events"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_analytics_type_created" ON "analytics_events"("event_type", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "seller_profiles_user_id_key" ON "seller_profiles"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "seller_profiles_slug_key" ON "seller_profiles"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "seller_profiles_stripe_account_id_key" ON "seller_profiles"("stripe_account_id");

-- CreateIndex
CREATE INDEX "idx_seller_profiles_status" ON "seller_profiles"("status");

-- CreateIndex
CREATE INDEX "idx_seller_profiles_tier" ON "seller_profiles"("tier");

-- CreateIndex
CREATE UNIQUE INDEX "marketplace_templates_template_id_key" ON "marketplace_templates"("template_id");

-- CreateIndex
CREATE UNIQUE INDEX "marketplace_templates_slug_key" ON "marketplace_templates"("slug");

-- CreateIndex
CREATE INDEX "idx_marketplace_seller_id" ON "marketplace_templates"("seller_id");

-- CreateIndex
CREATE INDEX "idx_marketplace_is_published" ON "marketplace_templates"("is_published");

-- CreateIndex
CREATE INDEX "idx_marketplace_status" ON "marketplace_templates"("status");

-- CreateIndex
CREATE INDEX "idx_marketplace_price" ON "marketplace_templates"("price_cents");

-- CreateIndex
CREATE INDEX "idx_listing_moderation_listing" ON "listing_moderations"("marketplace_template_id", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "marketplace_purchases_stripe_payment_intent_id_key" ON "marketplace_purchases"("stripe_payment_intent_id");

-- CreateIndex
CREATE INDEX "idx_mp_purchase_buyer" ON "marketplace_purchases"("buyer_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_mp_purchase_listing" ON "marketplace_purchases"("listing_id");

-- CreateIndex
CREATE UNIQUE INDEX "uidx_marketplace_purchase_once" ON "marketplace_purchases"("listing_id", "buyer_id");

-- CreateIndex
CREATE INDEX "idx_ledger_seller" ON "marketplace_ledger_entries"("seller_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "uidx_ledger_purchase_type" ON "marketplace_ledger_entries"("purchase_id", "entry_type");

-- CreateIndex
CREATE UNIQUE INDEX "seller_payouts_stripe_transfer_id_key" ON "seller_payouts"("stripe_transfer_id");

-- CreateIndex
CREATE INDEX "idx_seller_payouts" ON "seller_payouts"("seller_profile_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_template_reviews_mt" ON "template_reviews"("marketplace_template_id");

-- CreateIndex
CREATE INDEX "idx_template_reviews_reviewer" ON "template_reviews"("reviewer_id");

-- CreateIndex
CREATE UNIQUE INDEX "uidx_template_reviews_once" ON "template_reviews"("marketplace_template_id", "reviewer_id");

-- CreateIndex
CREATE UNIQUE INDEX "marketplace_disputes_purchase_id_key" ON "marketplace_disputes"("purchase_id");

-- CreateIndex
CREATE INDEX "idx_disputes_status" ON "marketplace_disputes"("status", "created_at");

-- CreateIndex
CREATE INDEX "idx_copyright_claims_status" ON "copyright_claims"("status");

-- CreateIndex
CREATE INDEX "idx_notifications_user_read" ON "notifications"("user_id", "is_read", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "portfolios_public_url_key" ON "portfolios"("public_url");

-- CreateIndex
CREATE INDEX "idx_portfolios_user_id" ON "portfolios"("user_id");

-- CreateIndex
CREATE INDEX "idx_audit_user_created" ON "audit_logs"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_audit_entity" ON "audit_logs"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "idx_audit_created_at" ON "audit_logs"("created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_collab_user_id" ON "collab_sessions"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "uidx_collab_cv_user" ON "collab_sessions"("cv_id", "user_id");

-- CreateIndex
CREATE INDEX "idx_collab_snapshots_cv" ON "collab_snapshots"("cv_id", "created_at" DESC);

-- AddForeignKey
ALTER TABLE "user_oauth_accounts" ADD CONSTRAINT "user_oauth_accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "templates" ADD CONSTRAINT "templates_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cvs" ADD CONSTRAINT "cvs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cvs" ADD CONSTRAINT "cvs_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cv_versions" ADD CONSTRAINT "cv_versions_cv_id_fkey" FOREIGN KEY ("cv_id") REFERENCES "cvs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "experiences" ADD CONSTRAINT "experiences_cv_id_fkey" FOREIGN KEY ("cv_id") REFERENCES "cvs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "education" ADD CONSTRAINT "education_cv_id_fkey" FOREIGN KEY ("cv_id") REFERENCES "cvs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skills" ADD CONSTRAINT "skills_cv_id_fkey" FOREIGN KEY ("cv_id") REFERENCES "cvs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_cv_id_fkey" FOREIGN KEY ("cv_id") REFERENCES "cvs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "languages" ADD CONSTRAINT "languages_cv_id_fkey" FOREIGN KEY ("cv_id") REFERENCES "cvs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_cv_id_fkey" FOREIGN KEY ("cv_id") REFERENCES "cvs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ats_reports" ADD CONSTRAINT "ats_reports_cv_id_fkey" FOREIGN KEY ("cv_id") REFERENCES "cvs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_histories" ADD CONSTRAINT "ai_histories_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_histories" ADD CONSTRAINT "ai_histories_cv_id_fkey" FOREIGN KEY ("cv_id") REFERENCES "cvs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analytics_events" ADD CONSTRAINT "analytics_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seller_profiles" ADD CONSTRAINT "seller_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace_templates" ADD CONSTRAINT "marketplace_templates_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace_templates" ADD CONSTRAINT "marketplace_templates_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace_templates" ADD CONSTRAINT "marketplace_templates_seller_profile_id_fkey" FOREIGN KEY ("seller_profile_id") REFERENCES "seller_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listing_moderations" ADD CONSTRAINT "listing_moderations_marketplace_template_id_fkey" FOREIGN KEY ("marketplace_template_id") REFERENCES "marketplace_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace_purchases" ADD CONSTRAINT "marketplace_purchases_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "marketplace_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace_purchases" ADD CONSTRAINT "marketplace_purchases_buyer_id_fkey" FOREIGN KEY ("buyer_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace_ledger_entries" ADD CONSTRAINT "marketplace_ledger_entries_purchase_id_fkey" FOREIGN KEY ("purchase_id") REFERENCES "marketplace_purchases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace_ledger_entries" ADD CONSTRAINT "marketplace_ledger_entries_payout_id_fkey" FOREIGN KEY ("payout_id") REFERENCES "seller_payouts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seller_payouts" ADD CONSTRAINT "seller_payouts_seller_profile_id_fkey" FOREIGN KEY ("seller_profile_id") REFERENCES "seller_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "template_reviews" ADD CONSTRAINT "template_reviews_marketplace_template_id_fkey" FOREIGN KEY ("marketplace_template_id") REFERENCES "marketplace_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "template_reviews" ADD CONSTRAINT "template_reviews_reviewer_id_fkey" FOREIGN KEY ("reviewer_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace_disputes" ADD CONSTRAINT "marketplace_disputes_purchase_id_fkey" FOREIGN KEY ("purchase_id") REFERENCES "marketplace_purchases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace_disputes" ADD CONSTRAINT "marketplace_disputes_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "marketplace_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace_disputes" ADD CONSTRAINT "marketplace_disputes_buyer_id_fkey" FOREIGN KEY ("buyer_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "copyright_claims" ADD CONSTRAINT "copyright_claims_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "marketplace_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "copyright_claims" ADD CONSTRAINT "copyright_claims_claimant_id_fkey" FOREIGN KEY ("claimant_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "portfolios" ADD CONSTRAINT "portfolios_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collab_sessions" ADD CONSTRAINT "collab_sessions_cv_id_fkey" FOREIGN KEY ("cv_id") REFERENCES "cvs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collab_sessions" ADD CONSTRAINT "collab_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collab_snapshots" ADD CONSTRAINT "collab_snapshots_cv_id_fkey" FOREIGN KEY ("cv_id") REFERENCES "cvs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collab_snapshots" ADD CONSTRAINT "collab_snapshots_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

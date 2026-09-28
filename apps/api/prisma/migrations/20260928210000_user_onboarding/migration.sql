-- Guided onboarding (/bienvenue). Additive and nullable: safe while older pods still run.
ALTER TABLE "users" ADD COLUMN "target_role" VARCHAR(120);
ALTER TABLE "users" ADD COLUMN "career_level" VARCHAR(32);
ALTER TABLE "users" ADD COLUMN "onboarding_completed_at" TIMESTAMPTZ(6);

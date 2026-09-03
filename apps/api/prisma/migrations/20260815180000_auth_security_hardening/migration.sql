-- Auth security hardening: lockout, backup codes, session binding, idle timeout

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "two_factor_backup_codes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "failed_login_attempts" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "locked_until" TIMESTAMPTZ(6);

ALTER TABLE "auth_sessions" ADD COLUMN IF NOT EXISTS "token_version" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "auth_sessions" ADD COLUMN IF NOT EXISTS "last_activity_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Additive: records a moderator suspending a published listing. Existing rows are untouched.
ALTER TYPE "ModerationDecision" ADD VALUE IF NOT EXISTS 'suspend';

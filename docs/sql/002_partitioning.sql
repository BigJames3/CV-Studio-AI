-- CV Studio AI — Partitioning for analytics_events & audit_logs
-- Apply AFTER Prisma creates base tables, OR replace plain tables with partitioned ones in a dedicated migration.
-- Strategy: RANGE on created_at (monthly). PK must include partition key.

-- ═══════════════════════════════════════════
-- Example: convert analytics_events (illustrative)
-- In practice: create partitioned table in initial SQL migration
-- instead of plain Prisma table for these two entities.
-- ═══════════════════════════════════════════

/*
DROP TABLE IF EXISTS analytics_events CASCADE;

CREATE TABLE analytics_events (
  id          UUID NOT NULL DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
  event_type  VARCHAR(128) NOT NULL,
  event_data  JSONB,
  session_id  VARCHAR(128),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

CREATE TABLE analytics_events_2026_07 PARTITION OF analytics_events
  FOR VALUES FROM ('2026-07-01') TO ('2026-08-01');

CREATE TABLE analytics_events_2026_08 PARTITION OF analytics_events
  FOR VALUES FROM ('2026-08-01') TO ('2026-09-01');

CREATE TABLE analytics_events_2026_09 PARTITION OF analytics_events
  FOR VALUES FROM ('2026-09-01') TO ('2026-10-01');

CREATE INDEX idx_analytics_user_created ON analytics_events (user_id, created_at DESC);
CREATE INDEX idx_analytics_type_created ON analytics_events (event_type, created_at DESC);
*/

-- Helper to create next month partition
CREATE OR REPLACE FUNCTION create_monthly_partition(
  parent_table text,
  year int,
  month int
) RETURNS void AS $$
DECLARE
  start_date date := make_date(year, month, 1);
  end_date   date := (start_date + interval '1 month')::date;
  part_name  text := format('%s_%s', parent_table, to_char(start_date, 'YYYY_MM'));
BEGIN
  EXECUTE format(
    'CREATE TABLE IF NOT EXISTS %I PARTITION OF %I FOR VALUES FROM (%L) TO (%L)',
    part_name, parent_table, start_date, end_date
  );
END;
$$ LANGUAGE plpgsql;

-- Cron suggestion (pg_cron or external):
-- SELECT create_monthly_partition('analytics_events', 2026, 10);
-- SELECT create_monthly_partition('audit_logs', 2026, 10);

-- Detach / archive old partitions example:
-- ALTER TABLE analytics_events DETACH PARTITION analytics_events_2025_01;
-- (dump to S3, then DROP TABLE)

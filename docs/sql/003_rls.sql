-- CV Studio AI — Row-Level Security policies
-- App must: SET LOCAL app.current_user_id = '<uuid>'; SET LOCAL app.is_admin = 'true'|'false';

-- Helper
CREATE OR REPLACE FUNCTION app_current_user_id() RETURNS uuid AS $$
  SELECT NULLIF(current_setting('app.current_user_id', true), '')::uuid;
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION app_is_admin() RETURNS boolean AS $$
  SELECT COALESCE(current_setting('app.is_admin', true), 'false') = 'true';
$$ LANGUAGE sql STABLE;

-- ── users (self) ─────────────────────────────
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY users_self_select ON users
  FOR SELECT USING (id = app_current_user_id() OR app_is_admin());

CREATE POLICY users_self_update ON users
  FOR UPDATE USING (id = app_current_user_id() OR app_is_admin());

-- Inserts via service role / bypass during signup (security definer function recommended)

-- ── cvs ──────────────────────────────────────
ALTER TABLE cvs ENABLE ROW LEVEL SECURITY;

CREATE POLICY cvs_owner_all ON cvs
  FOR ALL
  USING (
    (deleted_at IS NULL AND user_id = app_current_user_id())
    OR app_is_admin()
    OR (is_public = true AND deleted_at IS NULL) -- public read; tighten FOR SELECT only in prod
  )
  WITH CHECK (user_id = app_current_user_id() OR app_is_admin());

-- Prefer split policies: public SELECT separate from owner ALL

DROP POLICY IF EXISTS cvs_owner_all ON cvs;

CREATE POLICY cvs_owner_write ON cvs
  FOR ALL
  USING (user_id = app_current_user_id() OR app_is_admin())
  WITH CHECK (user_id = app_current_user_id() OR app_is_admin());

CREATE POLICY cvs_public_read ON cvs
  FOR SELECT
  USING (is_public = true AND deleted_at IS NULL);

-- ── child sections via ownership ─────────────
ALTER TABLE experiences ENABLE ROW LEVEL SECURITY;
CREATE POLICY experiences_via_cv ON experiences
  FOR ALL USING (
    app_is_admin() OR cv_id IN (SELECT id FROM cvs WHERE user_id = app_current_user_id())
  )
  WITH CHECK (
    app_is_admin() OR cv_id IN (SELECT id FROM cvs WHERE user_id = app_current_user_id())
  );

ALTER TABLE education ENABLE ROW LEVEL SECURITY;
CREATE POLICY education_via_cv ON education
  FOR ALL USING (
    app_is_admin() OR cv_id IN (SELECT id FROM cvs WHERE user_id = app_current_user_id())
  )
  WITH CHECK (
    app_is_admin() OR cv_id IN (SELECT id FROM cvs WHERE user_id = app_current_user_id())
  );

ALTER TABLE skills ENABLE ROW LEVEL SECURITY;
CREATE POLICY skills_via_cv ON skills
  FOR ALL USING (
    app_is_admin() OR cv_id IN (SELECT id FROM cvs WHERE user_id = app_current_user_id())
  )
  WITH CHECK (
    app_is_admin() OR cv_id IN (SELECT id FROM cvs WHERE user_id = app_current_user_id())
  );

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY projects_via_cv ON projects
  FOR ALL USING (
    app_is_admin() OR cv_id IN (SELECT id FROM cvs WHERE user_id = app_current_user_id())
  )
  WITH CHECK (
    app_is_admin() OR cv_id IN (SELECT id FROM cvs WHERE user_id = app_current_user_id())
  );

ALTER TABLE languages ENABLE ROW LEVEL SECURITY;
CREATE POLICY languages_via_cv ON languages
  FOR ALL USING (
    app_is_admin() OR cv_id IN (SELECT id FROM cvs WHERE user_id = app_current_user_id())
  )
  WITH CHECK (
    app_is_admin() OR cv_id IN (SELECT id FROM cvs WHERE user_id = app_current_user_id())
  );

ALTER TABLE certificates ENABLE ROW LEVEL SECURITY;
CREATE POLICY certificates_via_cv ON certificates
  FOR ALL USING (
    app_is_admin() OR cv_id IN (SELECT id FROM cvs WHERE user_id = app_current_user_id())
  )
  WITH CHECK (
    app_is_admin() OR cv_id IN (SELECT id FROM cvs WHERE user_id = app_current_user_id())
  );

-- ── ai_histories / notifications / portfolios ─
ALTER TABLE ai_histories ENABLE ROW LEVEL SECURITY;
CREATE POLICY ai_histories_owner ON ai_histories
  FOR ALL USING (user_id = app_current_user_id() OR app_is_admin())
  WITH CHECK (user_id = app_current_user_id() OR app_is_admin());

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY notifications_owner ON notifications
  FOR ALL USING (user_id = app_current_user_id() OR app_is_admin())
  WITH CHECK (user_id = app_current_user_id() OR app_is_admin());

ALTER TABLE portfolios ENABLE ROW LEVEL SECURITY;
CREATE POLICY portfolios_owner ON portfolios
  FOR ALL USING (user_id = app_current_user_id() OR app_is_admin())
  WITH CHECK (user_id = app_current_user_id() OR app_is_admin());
CREATE POLICY portfolios_public_read ON portfolios
  FOR SELECT USING (is_published = true);

-- Workers / migrations use a BYPASSRLS role — never the app login role.

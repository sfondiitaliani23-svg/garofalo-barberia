-- Garofalo Barberia — Analytics visitatori

CREATE TYPE visitor_gender AS ENUM ('male', 'female', 'child', 'other', 'unknown');
CREATE TYPE visitor_age_range AS ENUM (
  'under_18', '18_24', '25_34', '35_44', '45_54', '55_plus', 'unknown'
);

CREATE TABLE visitor_sessions (
  id UUID PRIMARY KEY,
  gender visitor_gender NOT NULL DEFAULT 'unknown',
  age_range visitor_age_range NOT NULL DEFAULT 'unknown',
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_agent TEXT,
  referrer TEXT
);

CREATE TABLE page_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES visitor_sessions(id) ON DELETE CASCADE,
  path TEXT NOT NULL,
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_page_views_viewed_at ON page_views (viewed_at);
CREATE INDEX idx_page_views_session ON page_views (session_id);
CREATE INDEX idx_visitor_sessions_last_seen ON visitor_sessions (last_seen_at);

ALTER TABLE visitor_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE page_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "analytics_admin_read_sessions" ON visitor_sessions
  FOR SELECT USING (is_admin());
CREATE POLICY "analytics_admin_read_views" ON page_views
  FOR SELECT USING (is_admin());
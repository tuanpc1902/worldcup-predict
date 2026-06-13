-- Activity logs: track all user behavior with full detail
-- Run in Supabase Dashboard → SQL Editor

CREATE TABLE IF NOT EXISTS public.user_activity_logs (
  id           BIGSERIAL PRIMARY KEY,
  user_id      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id   TEXT,
  action       TEXT NOT NULL,           -- e.g. page_view, predict_submit, login, group_join ...
  page         TEXT,                    -- current URL path
  detail       JSONB DEFAULT '{}',      -- extra data: match_id, team, score, group_id ...
  ip           TEXT,
  user_agent   TEXT,
  device_type  TEXT,                    -- mobile | tablet | desktop
  os           TEXT,
  browser      TEXT,
  referer      TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for common queries
CREATE INDEX IF NOT EXISTS idx_activity_user_id  ON public.user_activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_action   ON public.user_activity_logs(action);
CREATE INDEX IF NOT EXISTS idx_activity_created  ON public.user_activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_session  ON public.user_activity_logs(session_id);

-- RLS: only service role can write; admin can read via API
ALTER TABLE public.user_activity_logs ENABLE ROW LEVEL SECURITY;

-- No direct client reads (use admin API instead)
CREATE POLICY "service_only" ON public.user_activity_logs
  FOR ALL TO authenticated
  USING (false)
  WITH CHECK (false);

-- Auto-update match live status using pg_cron (runs inside Supabase DB)
-- Run this once in Supabase SQL Editor

-- 1. Enable pg_cron extension (requires Supabase Pro or pg_cron enabled project)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 2. Create the function that updates match statuses
CREATE OR REPLACE FUNCTION update_live_match_status()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- scheduled → live: kick-off time has passed
  UPDATE matches
  SET status = 'live'
  WHERE status = 'scheduled'
    AND match_time <= now();

  -- live → finished: score already exists (set by sync-matches API)
  UPDATE matches
  SET status = 'finished'
  WHERE status = 'live'
    AND home_score IS NOT NULL
    AND away_score IS NOT NULL;
END;
$$;

-- 3. Schedule the function to run every 2 minutes
SELECT cron.schedule(
  'update-live-match-status',   -- job name
  '*/2 * * * *',                -- every 2 minutes
  'SELECT update_live_match_status()'
);

-- Match goals table for World Cup 2026 scorers
CREATE TABLE IF NOT EXISTS match_goals (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id      uuid NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  player_name   text NOT NULL,
  team_name     text NOT NULL,
  team_flag     text,
  minute        integer,
  is_own_goal   boolean NOT NULL DEFAULT false,
  is_penalty    boolean NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS match_goals_match_id_idx    ON match_goals(match_id);
CREATE INDEX IF NOT EXISTS match_goals_player_name_idx ON match_goals(player_name);
CREATE INDEX IF NOT EXISTS match_goals_team_name_idx   ON match_goals(team_name);

-- Enable RLS
ALTER TABLE match_goals ENABLE ROW LEVEL SECURITY;

-- Anyone (including anon) can read goals — public standings data
CREATE POLICY "match_goals_public_read"
  ON match_goals FOR SELECT
  USING (true);

-- Only service role can write (sync-goals API uses service role key, bypasses RLS)
-- No INSERT/UPDATE/DELETE policies needed for anon/authenticated users

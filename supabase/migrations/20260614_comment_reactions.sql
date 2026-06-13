-- Per-user comment reactions (replaces reactions JSONB column)
-- Run in Supabase Dashboard → SQL Editor

CREATE TABLE IF NOT EXISTS public.comment_reactions (
  id          BIGSERIAL PRIMARY KEY,
  comment_id  UUID        NOT NULL REFERENCES public.match_comments(id) ON DELETE CASCADE,
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  emoji       TEXT        NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (comment_id, user_id, emoji)
);

CREATE INDEX IF NOT EXISTS idx_comment_reactions_comment ON public.comment_reactions(comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_reactions_user    ON public.comment_reactions(user_id);

-- RLS
ALTER TABLE public.comment_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone can read reactions"
  ON public.comment_reactions FOR SELECT TO authenticated USING (true);

CREATE POLICY "user can insert own reaction"
  ON public.comment_reactions FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "user can delete own reaction"
  ON public.comment_reactions FOR DELETE TO authenticated
  USING (user_id = auth.uid());

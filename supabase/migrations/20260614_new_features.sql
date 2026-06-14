-- New features: bracket predictions + achievements
-- Run in Supabase Dashboard → SQL Editor

-- ─────────────────────────────────────────────
-- 1. Bracket Predictions
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.bracket_predictions (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  round       TEXT        NOT NULL CHECK (round IN ('round_of_16', 'quarter', 'semi', 'final', 'champion')),
  slot        INTEGER     NOT NULL, -- position in the bracket (0-based)
  team_name   TEXT        NOT NULL,
  points_earned INTEGER,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, round, slot)
);

ALTER TABLE public.bracket_predictions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users view all bracket preds" ON public.bracket_predictions FOR SELECT TO authenticated USING (true);
CREATE POLICY "users manage own bracket preds" ON public.bracket_predictions FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_bracket_preds_user ON public.bracket_predictions(user_id);

-- ─────────────────────────────────────────────
-- 2. Achievements
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.achievements (
  id          TEXT        PRIMARY KEY, -- slug e.g. 'first_blood', 'hot_streak_5'
  name        TEXT        NOT NULL,
  description TEXT        NOT NULL,
  icon        TEXT        NOT NULL,   -- emoji
  points      INTEGER     NOT NULL DEFAULT 0
);

INSERT INTO public.achievements VALUES
  ('first_prediction',  'Dự đoán đầu tiên',        'Đã thực hiện dự đoán trận đầu tiên', '🎯', 0),
  ('first_exact',       'Thiện xạ',                 'Đoán đúng tỉ số chính xác lần đầu', '🎯', 5),
  ('hot_streak_3',      'Đang nóng!',               'Đoán đúng 3 trận liên tiếp',         '🔥', 5),
  ('hot_streak_5',      'Huyền thoại',              'Đoán đúng 5 trận liên tiếp',         '⚡', 10),
  ('top3_leaderboard',  'Lọt top 3',                'Lọt vào top 3 bảng xếp hạng',       '🏆', 10),
  ('predict_10',        'Người đoán chăm chỉ',      'Đã dự đoán 10 trận',                '📋', 5),
  ('predict_30',        'Chuyên gia dự đoán',       'Đã dự đoán 30 trận',                '🧠', 10),
  ('exact_5',           'Tay súng bách phát',       'Đoán đúng tỉ số 5 lần',             '💫', 15),
  ('champion_correct',  'Tiên tri nhà vô địch',     'Đoán đúng nhà vô địch World Cup',   '🌟', 20),
  ('group_top',         'Vương miện nhóm',           'Dẫn đầu nhóm riêng',               '👑', 5)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.user_achievements (
  id             BIGSERIAL   PRIMARY KEY,
  user_id        UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  achievement_id TEXT        NOT NULL REFERENCES public.achievements(id),
  awarded_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, achievement_id)
);

ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone reads user_achievements" ON public.user_achievements FOR SELECT TO authenticated USING (true);
CREATE POLICY "service inserts achievements"   ON public.user_achievements FOR INSERT TO authenticated WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_user_achievements_user ON public.user_achievements(user_id);

-- ─────────────────────────────────────────────
-- 3. Notification subscriptions (for reminders)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.match_reminders (
  id          BIGSERIAL   PRIMARY KEY,
  user_id     UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  match_id    UUID        NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  remind_at   TIMESTAMPTZ NOT NULL,
  sent        BOOLEAN     NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, match_id)
);

ALTER TABLE public.match_reminders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users manage own reminders" ON public.match_reminders FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

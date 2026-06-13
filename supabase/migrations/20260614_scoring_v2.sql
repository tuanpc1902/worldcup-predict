-- Scoring v2:
-- 1. 5pts exact score
-- 2. 3pts correct result (W/D/L)
-- 3. -1pt wrong OR no prediction
-- 4. Group total_points column
-- Run in Supabase Dashboard → SQL Editor

-- ─── 1. Update score_match to penalise non-predictors ─────────────────────

CREATE OR REPLACE FUNCTION public.score_match(p_match_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_match public.matches%rowtype;
  v_pred  record;
  v_pts   integer;
BEGIN
  SELECT * INTO v_match FROM public.matches
  WHERE id = p_match_id AND status = 'finished';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Match not found or not finished';
  END IF;

  -- Score users who submitted predictions
  FOR v_pred IN
    SELECT * FROM public.predictions
    WHERE match_id = p_match_id AND points_earned IS NULL
  LOOP
    IF v_pred.predicted_home = v_match.home_score
       AND v_pred.predicted_away = v_match.away_score THEN
      v_pts := 5;
    ELSIF
      (v_pred.predicted_home > v_pred.predicted_away AND v_match.home_score > v_match.away_score) OR
      (v_pred.predicted_home = v_pred.predicted_away AND v_match.home_score = v_match.away_score) OR
      (v_pred.predicted_home < v_pred.predicted_away AND v_match.home_score < v_match.away_score)
    THEN
      v_pts := 3;
    ELSE
      v_pts := -1;
    END IF;

    UPDATE public.predictions
      SET points_earned = v_pts, scored_at = now()
      WHERE id = v_pred.id;

    UPDATE public.profiles
      SET total_points = total_points + v_pts
      WHERE id = v_pred.user_id;
  END LOOP;

  -- Penalise users who did NOT predict (-1 per missed match)
  -- Insert a "missed" row (predicted_home = -1, predicted_away = -1) as sentinel
  WITH missed AS (
    INSERT INTO public.predictions (user_id, match_id, predicted_home, predicted_away, points_earned, scored_at)
    SELECT p.id, p_match_id, -1, -1, -1, now()
    FROM public.profiles p
    WHERE p.role = 'user'
      AND NOT EXISTS (
        SELECT 1 FROM public.predictions pr
        WHERE pr.match_id = p_match_id AND pr.user_id = p.id
      )
    RETURNING user_id
  )
  UPDATE public.profiles
    SET total_points = total_points - 1
    WHERE id IN (SELECT user_id FROM missed);

END;
$$;

-- ─── 2. Update leaderboard view to treat missed (-1/-1) as "wrong" ─────────
-- wrong_predictions now includes both actual wrong guesses AND missed games

CREATE OR REPLACE VIEW public.leaderboard AS
SELECT
  p.id,
  p.display_name,
  p.avatar_url,
  p.total_points,
  count(pr.id) FILTER (WHERE pr.points_earned IS NOT NULL AND NOT (pr.predicted_home = -1 AND pr.predicted_away = -1)) AS total_predicted,
  count(pr.id) FILTER (WHERE pr.points_earned = 5)  AS exact_scores,
  count(pr.id) FILTER (WHERE pr.points_earned = 3)  AS correct_results,
  count(pr.id) FILTER (WHERE pr.points_earned = -1) AS wrong_predictions,
  rank() OVER (ORDER BY p.total_points DESC)         AS rank
FROM public.profiles p
LEFT JOIN public.predictions pr ON pr.user_id = p.id
WHERE p.role = 'user'
GROUP BY p.id, p.display_name, p.avatar_url, p.total_points
ORDER BY p.total_points DESC;

-- ─── 3. Add total_points to groups ────────────────────────────────────────
-- Groups get a cached total_points = SUM of all approved member total_points

ALTER TABLE public.groups ADD COLUMN IF NOT EXISTS total_points INTEGER NOT NULL DEFAULT 0;

-- Function to refresh a group's total_points
CREATE OR REPLACE FUNCTION public.refresh_group_points(p_group_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.groups g
  SET total_points = (
    SELECT COALESCE(SUM(p.total_points), 0)
    FROM public.group_members gm
    JOIN public.profiles p ON p.id = gm.user_id
    WHERE gm.group_id = p_group_id AND gm.status = 'approved'
  )
  WHERE g.id = p_group_id;
END;
$$;

-- Trigger: update group points whenever a profile's total_points changes
CREATE OR REPLACE FUNCTION public.trigger_update_group_points()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Refresh all groups this user belongs to
  PERFORM public.refresh_group_points(gm.group_id)
  FROM public.group_members gm
  WHERE gm.user_id = NEW.id AND gm.status = 'approved';
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_update_group_points ON public.profiles;
CREATE TRIGGER trg_update_group_points
  AFTER UPDATE OF total_points ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_update_group_points();

-- Backfill existing groups with current member totals
UPDATE public.groups g
SET total_points = (
  SELECT COALESCE(SUM(p.total_points), 0)
  FROM public.group_members gm
  JOIN public.profiles p ON p.id = gm.user_id
  WHERE gm.group_id = g.id AND gm.status = 'approved'
);

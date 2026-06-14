-- Scoring v3: additive independent bonuses
-- +5 nếu đúng tỉ số (độc lập)
-- +3 nếu đúng kết quả W/D/L, -1 nếu sai kết quả (độc lập)
-- Kết hợp có thể: 8 (đúng cả 2), 4 (đúng tỉ số sai kết quả - impossible), 3 (đúng KQ), -1 (sai)
-- Run in Supabase Dashboard → SQL Editor

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

  FOR v_pred IN
    SELECT * FROM public.predictions
    WHERE match_id = p_match_id AND points_earned IS NULL
  LOOP
    v_pts := 0;

    -- +5 nếu đoán đúng tỉ số chính xác
    IF v_pred.predicted_home = v_match.home_score
       AND v_pred.predicted_away = v_match.away_score THEN
      v_pts := v_pts + 5;
    END IF;

    -- +3 nếu đúng kết quả (W/D/L), -1 nếu sai
    IF (v_pred.predicted_home > v_pred.predicted_away AND v_match.home_score > v_match.away_score) OR
       (v_pred.predicted_home = v_pred.predicted_away AND v_match.home_score = v_match.away_score) OR
       (v_pred.predicted_home < v_pred.predicted_away AND v_match.home_score < v_match.away_score)
    THEN
      v_pts := v_pts + 3;
    ELSE
      v_pts := v_pts - 1;
    END IF;

    UPDATE public.predictions
      SET points_earned = v_pts, scored_at = now()
      WHERE id = v_pred.id;

    UPDATE public.profiles
      SET total_points = total_points + v_pts
      WHERE id = v_pred.user_id;
  END LOOP;

  -- Phạt -1 với user không dự đoán (sentinel row predicted_home=-1, predicted_away=-1)
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

-- Leaderboard view: exact_scores = points_earned >= 5 (8 = exact+correct, 4 = exact+wrong)
CREATE OR REPLACE VIEW public.leaderboard AS
SELECT
  p.id,
  p.display_name,
  p.avatar_url,
  p.total_points,
  count(pr.id) FILTER (WHERE pr.points_earned IS NOT NULL AND NOT (pr.predicted_home = -1 AND pr.predicted_away = -1)) AS total_predicted,
  count(pr.id) FILTER (WHERE pr.points_earned >= 5)  AS exact_scores,
  count(pr.id) FILTER (WHERE pr.points_earned = 3)   AS correct_results,
  count(pr.id) FILTER (WHERE pr.points_earned = -1)  AS wrong_predictions,
  rank() OVER (ORDER BY p.total_points DESC)          AS rank
FROM public.profiles p
LEFT JOIN public.predictions pr ON pr.user_id = p.id
WHERE p.role = 'user'
GROUP BY p.id, p.display_name, p.avatar_url, p.total_points
ORDER BY p.total_points DESC;

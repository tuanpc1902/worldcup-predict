-- ============================================================
-- Supabase pg_cron: tự động chuyển trạng thái trận đấu
-- Chạy trong Supabase Dashboard → SQL Editor
-- Yêu cầu extension pg_cron (có sẵn trên Supabase)
-- ============================================================

-- Bật pg_cron nếu chưa có
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Xoá job cũ nếu có
SELECT cron.unschedule('update-match-live-status') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'update-match-live-status'
);

-- Chạy mỗi phút: scheduled → live khi đã qua giờ thi đấu
SELECT cron.schedule(
  'update-match-live-status',
  '* * * * *',
  $$
    UPDATE public.matches
    SET status = 'live'
    WHERE status = 'scheduled'
      AND match_time <= NOW();
  $$
);

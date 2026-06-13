-- ============================================================
-- FULL RESET (xoá tất cả — users, groups, matches, goals...)
-- ⚠️  KHÔNG THỂ HOÀN TÁC — chỉ dùng khi bắt đầu season mới
-- Chạy trong Supabase Dashboard → SQL Editor
-- ============================================================

BEGIN;

-- 1. Xoá tất cả dữ liệu game
DELETE FROM public.predictions;
DELETE FROM public.group_members;
DELETE FROM public.groups;
DELETE FROM public.match_comments;
DELETE FROM public.champion_picks;
DELETE FROM public.user_activity_logs;

-- 2. Xoá goals
DELETE FROM public.match_goals;

-- 3. Reset matches (giữ lịch thi đấu, xoá kết quả)
UPDATE public.matches
SET home_score = NULL,
    away_score = NULL,
    status     = 'scheduled',
    is_locked  = false;

-- 4. Xoá profiles (user data) — auth.users vẫn còn, xoá manual bên dưới
DELETE FROM public.profiles WHERE role = 'user';

-- 5. Kiểm tra
SELECT 'predictions'    AS table_name, COUNT(*) FROM public.predictions
UNION ALL
SELECT 'groups',                        COUNT(*) FROM public.groups
UNION ALL
SELECT 'match_comments',                COUNT(*) FROM public.match_comments
UNION ALL
SELECT 'champion_picks',                COUNT(*) FROM public.champion_picks
UNION ALL
SELECT 'match_goals',                   COUNT(*) FROM public.match_goals
UNION ALL
SELECT 'profiles (users)',              COUNT(*) FROM public.profiles WHERE role = 'user'
UNION ALL
SELECT 'matches (scheduled)',           COUNT(*) FROM public.matches WHERE status = 'scheduled';

COMMIT;

-- ============================================================
-- SAU KHI CHẠY SQL TRÊN: xoá auth users thủ công
-- Supabase Dashboard → Authentication → Users
-- Chọn tất cả → Delete
-- HOẶC dùng script Node bên dưới (cần SERVICE_ROLE_KEY):
-- ============================================================
--
-- node scripts/delete_auth_users.js
--

-- ============================================================
-- RESET GAME DATA (giữ lại users + matches)
-- Chạy trong Supabase Dashboard → SQL Editor
-- Xoá: predictions, groups, comments, champion_picks,
--       activity_logs, và reset điểm về 0
-- ============================================================

BEGIN;

-- 1. Xoá tất cả dự đoán
DELETE FROM public.predictions;

-- 2. Xoá tất cả nhóm và thành viên (cascade)
DELETE FROM public.group_members;
DELETE FROM public.groups;

-- 3. Xoá bình luận
DELETE FROM public.match_comments;

-- 4. Xoá dự đoán nhà vô địch
DELETE FROM public.champion_picks;

-- 5. Reset điểm tất cả users về 0
UPDATE public.profiles
SET total_points = 0
WHERE role = 'user';

-- 6. Xoá activity logs (tuỳ chọn — comment dòng này nếu muốn giữ)
DELETE FROM public.user_activity_logs;

-- 7. Kiểm tra
SELECT 'predictions'       AS table_name, COUNT(*) FROM public.predictions
UNION ALL
SELECT 'groups',                           COUNT(*) FROM public.groups
UNION ALL
SELECT 'group_members',                    COUNT(*) FROM public.group_members
UNION ALL
SELECT 'match_comments',                   COUNT(*) FROM public.match_comments
UNION ALL
SELECT 'champion_picks',                   COUNT(*) FROM public.champion_picks
UNION ALL
SELECT 'profiles (total_points=0)',        COUNT(*) FROM public.profiles WHERE total_points = 0 AND role = 'user';

COMMIT;

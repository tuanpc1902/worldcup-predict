-- ============================================================
-- SYSTEM CONFIG TABLE
-- Chạy trong Supabase Dashboard → SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS public.system_config (
  key         TEXT PRIMARY KEY,
  value       TEXT NOT NULL DEFAULT 'true',
  label       TEXT NOT NULL,
  description TEXT,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Realtime: cần FULL để UPDATE payload chứa toàn bộ row (key + value)
ALTER TABLE public.system_config REPLICA IDENTITY FULL;

-- Thêm vào realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.system_config;

-- RLS: public read, only service role can write (via API)
ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public read" ON public.system_config;
CREATE POLICY "public read" ON public.system_config
  FOR SELECT TO anon, authenticated USING (true);

-- Default values
INSERT INTO public.system_config (key, value, label, description) VALUES
  -- Realtime
  ('realtime_leaderboard',  'true',  'Realtime Xếp hạng',    'Bảng xếp hạng cập nhật tự động khi có thay đổi điểm'),
  ('realtime_match',        'true',  'Realtime Trận đấu',     'Tỉ số + bàn thắng + bình luận cập nhật realtime'),
  ('realtime_profile',      'true',  'Realtime Profile',      'Điểm cá nhân trên navbar cập nhật tự động'),
  -- Features
  ('predictions_open',      'true',  'Mở dự đoán',           'Cho phép users gửi / sửa dự đoán'),
  ('comments_enabled',      'true',  'Bình luận',             'Hiện ô bình luận trong trang trận đấu'),
  ('champion_picks_open',   'true',  'Chọn nhà vô địch',     'Cho phép users chọn nhà vô địch'),
  -- Nav links (ẩn/hiện từng tab)
  ('nav_predict',           'true',  'Nav: Dự đoán',          'Hiện tab Dự đoán trên navbar'),
  ('nav_history',           'true',  'Nav: Lịch sử',          'Hiện tab Lịch sử'),
  ('nav_standings',         'true',  'Nav: Bảng đấu',         'Hiện tab Bảng đấu'),
  ('nav_leaderboard',       'true',  'Nav: Xếp hạng',         'Hiện tab Xếp hạng'),
  ('nav_champion',          'true',  'Nav: Nhà vô địch',      'Hiện tab Nhà vô địch'),
  ('nav_bracket',           'true',  'Nav: Bracket',           'Hiện tab Bracket'),
  ('nav_h2h',               'true',  'Nav: H2H',               'Hiện tab H2H'),
  ('nav_groups',            'true',  'Nav: Nhóm',              'Hiện tab Nhóm'),
  ('nav_history_public',    'false', 'Nav: Lịch sử (public)', 'Hiện Lịch sử cho cả user chưa đăng nhập')
ON CONFLICT (key) DO NOTHING;

-- Bổ sung các toggle mới (chạy riêng nếu bảng đã tồn tại)
INSERT INTO public.system_config (key, value, label, description) VALUES
  -- Hệ thống
  ('maintenance_mode',       'false', 'Bảo trì',                   'Chuyển tất cả user (trừ admin) sang trang thông báo bảo trì'),
  ('registration_open',      'true',  'Đăng ký tài khoản',         'Cho phép tạo tài khoản mới từ trang đăng nhập'),
  -- Dự đoán
  ('predictions_editable',   'true',  'Sửa dự đoán',               'Cho phép user sửa dự đoán đã nộp (trước khi trận khóa)'),
  -- Nhóm
  ('group_creation_open',    'true',  'Tạo nhóm mới',              'Cho phép user tạo nhóm mới'),
  -- Hiển thị
  ('show_scores',            'true',  'Hiện tỉ số',                'Hiển thị kết quả tỉ số các trận đã kết thúc'),
  ('show_prediction_stats',  'true',  'Hiện thống kê dự đoán',     'Hiển thị % dự đoán của cộng đồng trong trang chi tiết trận'),
  ('show_goals',             'true',  'Hiện cầu thủ ghi bàn',      'Hiển thị tên cầu thủ và phút ghi bàn'),
  ('show_leaderboard_points','true',  'Hiện điểm XH',              'Hiển thị điểm số thực tế trên bảng xếp hạng (tắt = chỉ hiện thứ hạng)')
ON CONFLICT (key) DO NOTHING;

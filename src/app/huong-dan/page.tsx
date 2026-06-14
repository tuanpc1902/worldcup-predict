import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Hướng dẫn chơi — WC-88',
  description: 'Hướng dẫn đầy đủ cách chơi dự đoán World Cup 2026 trên WC-88',
}

const SECTIONS = [
  {
    id: 'dang-ky',
    icon: '👤',
    title: 'Đăng ký & đăng nhập',
    content: [
      'Truy cập trang web và bấm "Đăng nhập" ở góc trên bên phải.',
      'Nếu chưa có tài khoản, liên hệ admin để được cấp tài khoản.',
      'Sau khi đăng nhập, bạn có thể bắt đầu dự đoán ngay.',
    ],
  },
  {
    id: 'du-doan',
    icon: '⚽',
    title: 'Dự đoán tỉ số',
    content: [
      'Vào trang "Dự đoán" để xem danh sách các trận sắp diễn ra.',
      'Nhập tỉ số bạn dự đoán cho từng trận (ví dụ: 2 - 1).',
      'Dự đoán phải được gửi trước khi trận bắt đầu — sau đó sẽ bị khoá.',
      'Mỗi trận chỉ được dự đoán 1 lần, không thể sửa sau khi trận đã bắt đầu.',
    ],
  },
  {
    id: 'tinh-diem',
    icon: '🎯',
    title: 'Hệ thống tính điểm',
    content: [],
    table: [
      { ket_qua: 'Đoán đúng tỉ số chính xác', diem: '+5 điểm', vi_du: 'Dự đoán 2-1, kết quả 2-1' },
      { ket_qua: 'Đoán đúng kết quả (thắng/hoà/thua)', diem: '+3 điểm', vi_du: 'Dự đoán 2-1, kết quả 3-0' },
      { ket_qua: 'Đoán đúng tỉ số chính xác VÀ đúng kết quả', diem: '+8 điểm', vi_du: 'Dự đoán 2-1, kết quả 2-1 (cộng cả 2)' },
      { ket_qua: 'Đoán sai kết quả', diem: '-1 điểm', vi_du: 'Dự đoán thắng nhưng lại thua' },
      { ket_qua: 'Không dự đoán', diem: '-1 điểm', vi_du: 'Bỏ qua trận đấu' },
    ],
    note: 'Điểm được cập nhật tự động sau khi trận kết thúc.',
  },
  {
    id: 'bang-xep-hang',
    icon: '🏆',
    title: 'Bảng xếp hạng',
    content: [
      'Trang "Bảng xếp hạng" hiển thị thứ hạng của tất cả người chơi.',
      'Top 3 được hiển thị riêng trên podium với huy hiệu vàng/bạc/đồng.',
      'Bảng xếp hạng cập nhật theo thời gian thực.',
    ],
  },
  {
    id: 'hang',
    icon: '💎',
    title: 'Hệ thống hạng',
    content: [],
    tiers: [
      { icon: '💎', name: 'Platinum', min: 150, color: '#0ea5e9' },
      { icon: '🥇', name: 'Gold', min: 80, color: '#d97706' },
      { icon: '🥈', name: 'Silver', min: 30, color: '#6b7280' },
      { icon: '🥉', name: 'Bronze', min: 0, color: '#92400e' },
    ],
    note: 'Hạng được cập nhật tự động khi điểm của bạn thay đổi. Xem hạng hiện tại trên trang cá nhân.',
  },
  {
    id: 'nhom',
    icon: '👥',
    title: 'Nhóm riêng',
    content: [
      'Tạo nhóm riêng cùng bạn bè để có bảng xếp hạng nội bộ.',
      'Chia sẻ mã mời (invite code) để mời người tham gia nhóm.',
      'Mỗi người có thể tham gia nhiều nhóm cùng lúc.',
      'Vào trang "Nhóm" để xem bảng xếp hạng và so sánh với các thành viên khác.',
    ],
  },
  {
    id: 'bracket',
    icon: '🗓️',
    title: 'Dự đoán bracket knockout',
    content: [
      'Ngoài từng trận đơn lẻ, bạn có thể dự đoán kết quả toàn bộ vòng loại trực tiếp.',
      'Dự đoán đội thắng ở từng lượt: Vòng 1/8, Tứ kết, Bán kết, Chung kết và Nhà vô địch.',
      'Vào trang "Bracket" để dự đoán và theo dõi kết quả.',
    ],
  },
  {
    id: 'thanh-tich',
    icon: '🏅',
    title: 'Thành tích & huy hiệu',
    content: [],
    achievements: [
      { icon: '🎯', name: 'Dự đoán đầu tiên', desc: 'Gửi dự đoán lần đầu tiên' },
      { icon: '🔥', name: 'Đúng 3 trận liên tiếp', desc: 'Đoán đúng kết quả 3 trận liên tiếp' },
      { icon: '⚡', name: 'Đúng 5 trận liên tiếp', desc: 'Đoán đúng kết quả 5 trận liên tiếp' },
      { icon: '💎', name: 'Đoán chính xác', desc: 'Lần đầu đoán đúng tỉ số chính xác' },
      { icon: '🏆', name: 'Top 3', desc: 'Lọt vào top 3 bảng xếp hạng' },
      { icon: '📊', name: 'Dự đoán 10 trận', desc: 'Gửi dự đoán cho 10 trận' },
      { icon: '📈', name: 'Dự đoán 30 trận', desc: 'Gửi dự đoán cho 30 trận' },
      { icon: '🎳', name: '5 lần chính xác', desc: 'Đoán đúng tỉ số chính xác 5 lần' },
      { icon: '🌟', name: 'Đoán đúng nhà vô địch', desc: 'Dự đoán đúng đội vô địch World Cup' },
      { icon: '🥇', name: 'Top nhóm', desc: 'Dẫn đầu bảng xếp hạng trong một nhóm' },
    ],
    note: 'Thành tích được kiểm tra tự động khi bạn vào trang cá nhân.',
  },
  {
    id: 'chia-se',
    icon: '📤',
    title: 'Chia sẻ kết quả',
    content: [
      'Sau khi trận kết thúc, bạn có thể chia sẻ kết quả dự đoán của mình.',
      'Bấm nút "Chia sẻ" ở mỗi trận trong trang Lịch sử để gửi lên mạng xã hội hoặc copy link.',
    ],
  },
  {
    id: 'nhac-nho',
    icon: '🔔',
    title: 'Nhắc nhở trước trận',
    content: [
      'Bấm biểu tượng chuông 🔔 cạnh trận đấu để đặt nhắc nhở.',
      'Trình duyệt sẽ thông báo trước khi trận bắt đầu (cần cho phép thông báo).',
      'Chỉ hoạt động khi trình duyệt đang mở.',
    ],
  },
  {
    id: 'thong-ke',
    icon: '📊',
    title: 'Thống kê cá nhân',
    content: [
      'Vào trang cá nhân để xem toàn bộ lịch sử dự đoán.',
      'Xem tỉ lệ đúng, số lần đoán chính xác, số trận đã dự đoán.',
      'So sánh với người khác qua tính năng Head-to-head.',
    ],
  },
]

export default function HuongDanPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-8 pb-24">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="text-4xl">⚽</div>
        <h1 className="text-2xl font-black text-slate-800">Hướng dẫn chơi</h1>
        <p className="text-slate-500 text-sm">WC-88 · World Cup 2026 · Dự đoán — Cạnh tranh — Vui vẻ</p>
      </div>

      {/* Quick nav */}
      <div className="bg-slate-50 rounded-2xl p-4">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Nội dung</p>
        <div className="grid grid-cols-2 gap-1.5">
          {SECTIONS.map(s => (
            <a key={s.id} href={`#${s.id}`}
              className="flex items-center gap-2 text-sm text-slate-600 hover:text-green-600 py-1 transition-colors">
              <span>{s.icon}</span>
              <span>{s.title}</span>
            </a>
          ))}
        </div>
      </div>

      {/* Sections */}
      {SECTIONS.map(s => (
        <section key={s.id} id={s.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden scroll-mt-20">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
            <span className="text-2xl">{s.icon}</span>
            <h2 className="font-bold text-slate-800">{s.title}</h2>
          </div>

          <div className="px-5 py-4 space-y-4">
            {s.content.length > 0 && (
              <ul className="space-y-2">
                {s.content.map((c, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                    <span className="text-green-500 mt-0.5 flex-shrink-0">✓</span>
                    <span>{c}</span>
                  </li>
                ))}
              </ul>
            )}

            {/* Bảng tính điểm */}
            {'table' in s && s.table && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50">
                      <th className="text-left px-3 py-2 text-xs font-semibold text-slate-500">Kết quả</th>
                      <th className="text-center px-3 py-2 text-xs font-semibold text-slate-500">Điểm</th>
                      <th className="text-left px-3 py-2 text-xs font-semibold text-slate-500 hidden sm:table-cell">Ví dụ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {s.table.map((row, i) => (
                      <tr key={i}>
                        <td className="px-3 py-2.5 text-slate-700">{row.ket_qua}</td>
                        <td className="px-3 py-2.5 text-center">
                          <span className={`font-bold text-sm px-2 py-0.5 rounded-full ${
                            row.diem.startsWith('+') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
                          }`}>
                            {row.diem}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-slate-400 text-xs hidden sm:table-cell">{row.vi_du}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Hệ thống hạng */}
            {'tiers' in s && s.tiers && (
              <div className="space-y-2">
                {s.tiers.map(t => (
                  <div key={t.name} className="flex items-center gap-3 px-3 py-2.5 rounded-xl border"
                    style={{ borderColor: t.color + '40', background: t.color + '10' }}>
                    <span className="text-xl">{t.icon}</span>
                    <div className="flex-1">
                      <span className="font-semibold text-sm" style={{ color: t.color }}>{t.name}</span>
                    </div>
                    <span className="text-xs text-slate-500">
                      {t.min === 0 ? 'Từ 0 điểm' : `Từ ${t.min} điểm`}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Thành tích */}
            {'achievements' in s && s.achievements && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {s.achievements.map(a => (
                  <div key={a.name} className="flex items-start gap-2.5 p-3 bg-slate-50 rounded-xl">
                    <span className="text-xl flex-shrink-0">{a.icon}</span>
                    <div>
                      <p className="text-sm font-semibold text-slate-700">{a.name}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{a.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {'note' in s && s.note && (
              <p className="text-xs text-slate-400 bg-slate-50 rounded-lg px-3 py-2">
                💡 {s.note}
              </p>
            )}
          </div>
        </section>
      ))}

      {/* CTA */}
      <div className="text-center space-y-3 pt-2">
        <p className="text-slate-500 text-sm">Sẵn sàng chưa?</p>
        <Link href="/predict"
          className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-bold px-6 py-3 rounded-xl transition-colors">
          ⚽ Bắt đầu dự đoán
        </Link>
      </div>
    </div>
  )
}

'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth'

type Mode = 'game' | 'full'

const MODES = [
  {
    id: 'game' as Mode,
    label: 'Reset Game Data',
    icon: '🎮',
    color: 'border-amber-300 bg-amber-50',
    activeColor: 'border-amber-500 bg-amber-100',
    btnColor: 'bg-amber-500 hover:bg-amber-600',
    items: [
      '✓ Xoá tất cả dự đoán',
      '✓ Xoá tất cả nhóm và thành viên',
      '✓ Xoá bình luận',
      '✓ Xoá dự đoán nhà vô địch',
      '✓ Xoá activity logs',
      '✓ Reset điểm tất cả users về 0',
      '— Giữ lại tài khoản users',
      '— Giữ lại lịch thi đấu và kết quả',
    ],
  },
  {
    id: 'full' as Mode,
    label: 'Full Reset',
    icon: '💥',
    color: 'border-red-300 bg-red-50',
    activeColor: 'border-red-500 bg-red-100',
    btnColor: 'bg-red-600 hover:bg-red-700',
    items: [
      '✓ Tất cả của Game Data Reset',
      '✓ Xoá bàn thắng (match_goals)',
      '✓ Reset kết quả tất cả trận về "scheduled"',
      '✓ Xoá profiles users (giữ admin)',
      '⚠️ Auth users cần xoá thủ công trong Supabase Dashboard',
    ],
  },
]

export default function ResetPage() {
  const { user, init, loading } = useAuthStore()
  const router = useRouter()
  const [selected, setSelected] = useState<Mode>('game')
  const [confirm, setConfirm] = useState('')
  const [running, setRunning] = useState(false)
  const [log, setLog] = useState<string[]>([])
  const [error, setError] = useState('')

  useEffect(() => { init() }, [init])
  useEffect(() => {
    if (!loading && (!user || user.role !== 'admin')) router.replace('/')
  }, [user, loading, router])

  const mode = MODES.find(m => m.id === selected)!
  const ready = confirm === 'RESET'

  async function runReset() {
    if (!ready) return
    setRunning(true)
    setLog([])
    setError('')
    try {
      const res = await fetch('/api/admin/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: selected, confirm: 'RESET' }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Lỗi không xác định')
        setLog(data.log ?? [])
      } else {
        setLog(data.log ?? [])
        setConfirm('')
      }
    } catch (e) {
      setError(String(e))
    }
    setRunning(false)
  }

  if (loading) return null

  return (
    <div className="max-w-xl space-y-6">
      <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 font-medium">
        ⚠️ Thao tác này <strong>KHÔNG THỂ HOÀN TÁC</strong>. Chỉ thực hiện khi bắt đầu season mới.
      </div>

      {/* Mode selector */}
      <div className="space-y-3">
        {MODES.map(m => (
          <button
            key={m.id}
            onClick={() => { setSelected(m.id); setConfirm(''); setLog([]); setError('') }}
            className={`w-full text-left border-2 rounded-xl p-4 transition-all ${selected === m.id ? m.activeColor : m.color} hover:opacity-90`}
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">{m.icon}</span>
              <span className="font-bold text-slate-800">{m.label}</span>
              {selected === m.id && <span className="ml-auto text-xs bg-white px-2 py-0.5 rounded-full text-slate-600 font-medium">Đã chọn</span>}
            </div>
            <ul className="space-y-0.5">
              {m.items.map((item, i) => (
                <li key={i} className={`text-xs ${item.startsWith('⚠️') ? 'text-red-600 font-medium' : item.startsWith('—') ? 'text-slate-400' : 'text-slate-600'}`}>
                  {item}
                </li>
              ))}
            </ul>
          </button>
        ))}
      </div>

      {/* Confirm input */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
        <p className="text-sm text-slate-700">
          Gõ <code className="bg-slate-100 px-1.5 py-0.5 rounded font-mono font-bold text-red-600">RESET</code> để xác nhận
        </p>
        <input
          value={confirm}
          onChange={e => setConfirm(e.target.value)}
          placeholder="RESET"
          className={`w-full border rounded-lg px-4 py-2.5 font-mono text-center text-lg tracking-widest focus:outline-none focus:ring-2 transition-colors ${
            ready ? 'border-red-400 focus:ring-red-300 text-red-700 bg-red-50' : 'border-slate-300 focus:ring-slate-200'
          }`}
        />
        <button
          onClick={runReset}
          disabled={!ready || running}
          className={`w-full text-white font-bold py-3 rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed ${mode.btnColor}`}
        >
          {running ? 'Đang thực hiện...' : `${mode.icon} Chạy ${mode.label}`}
        </button>
      </div>

      {/* Result log */}
      {(log.length > 0 || error) && (
        <div className={`rounded-xl border p-4 font-mono text-xs space-y-1 ${error ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
          {error && <p className="text-red-600 font-bold mb-2">❌ {error}</p>}
          {log.map((line, i) => (
            <p key={i} className="text-slate-600">{line}</p>
          ))}
          {!error && log.length > 0 && (
            <p className="text-green-700 font-bold pt-1">✅ Hoàn tất!</p>
          )}
          {selected === 'full' && !error && (
            <p className="text-amber-700 mt-2 font-sans">
              ⚠️ Còn phải xoá auth users thủ công: Supabase Dashboard → Authentication → Users → Select All → Delete
            </p>
          )}
        </div>
      )}

      {/* SQL scripts reference */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">SQL Scripts (chạy trực tiếp trong Supabase)</p>
        <div className="space-y-1">
          <code className="block text-xs text-slate-600">scripts/reset_game_data.sql — reset nhẹ</code>
          <code className="block text-xs text-slate-600">scripts/reset_full.sql — reset toàn bộ</code>
          <code className="block text-xs text-slate-600">node scripts/delete_auth_users.js — xoá auth users</code>
        </div>
      </div>
    </div>
  )
}

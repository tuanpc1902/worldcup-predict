'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth'
import type { Match } from '@/types'
import { fmtDateTime } from '@/lib/time'

const STAGES = ['group', 'round_of_32', 'round_of_16', 'quarter', 'semi', 'final']
const STAGE_LABELS: Record<string, string> = {
  group: 'Vòng bảng', round_of_32: 'Vòng 1/16', round_of_16: 'Vòng 1/8',
  quarter: 'Tứ kết', semi: 'Bán kết', final: 'Chung kết',
}

export default function AdminPage() {
  const { user, init, loading } = useAuthStore()
  const router = useRouter()
  const supabase = createClient()
  const [matches, setMatches] = useState<Match[]>([])
  const [fetching, setFetching] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [syncingGoals, setSyncingGoals] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [editMatch, setEditMatch] = useState<Match | null>(null)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null)
  const [filter, setFilter] = useState<'all' | 'scheduled' | 'live' | 'finished'>('all')

  useEffect(() => { init() }, [init])
  useEffect(() => { if (!loading && (!user || user.role !== 'admin')) router.replace('/') }, [user, loading, router])

  const loadMatches = async () => {
    const { data } = await supabase.from('matches').select('*').order('match_time')
    setMatches(data ?? [])
    setFetching(false)
  }

  useEffect(() => { if (user?.role === 'admin') loadMatches() }, [user])

  function flash(text: string, ok: boolean) {
    setMsg({ text, ok })
    setTimeout(() => setMsg(null), 4000)
  }

  async function syncFromApi() {
    setSyncing(true)
    try {
      const res = await fetch('/api/sync-matches', { method: 'POST' })
      const json = await res.json()
      flash(json.message ?? 'Sync xong!', res.ok)
      await loadMatches()
    } catch { flash('Lỗi khi sync', false) }
    setSyncing(false)
  }

  async function syncGoals() {
    setSyncingGoals(true)
    try {
      const res = await fetch('/api/sync-goals', { method: 'POST' })
      const json = await res.json()
      flash(json.message ?? 'Sync goals xong!', res.ok)
    } catch { flash('Lỗi khi sync goals', false) }
    setSyncingGoals(false)
  }

  async function updateLiveStatus() {
    setUpdatingStatus(true)
    try {
      const res = await fetch('/api/update-live-status')
      const json = await res.json()
      const detail = `Kích hoạt: ${json.activated ?? 0}, Kết thúc: ${json.finished ?? 0}`
      flash(detail, res.ok)
      await loadMatches()
    } catch { flash('Lỗi cập nhật trạng thái', false) }
    setUpdatingStatus(false)
  }

  async function toggleLock(match: Match) {
    await supabase.from('matches').update({ is_locked: !match.is_locked }).eq('id', match.id)
    setMatches(prev => prev.map(m => m.id === match.id ? { ...m, is_locked: !m.is_locked } : m))
  }

  const filtered = matches.filter(m => filter === 'all' ? true : m.status === filter)

  const liveCount = matches.filter(m => m.status === 'live').length
  const scheduledCount = matches.filter(m => m.status === 'scheduled').length
  const finishedCount = matches.filter(m => m.status === 'finished').length

  if (loading || fetching) return <div className="h-48 bg-white rounded-xl border border-slate-200 animate-pulse" />

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Admin Panel</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {matches.length} trận ·
            <span className="text-red-500 ml-1">{liveCount} live</span> ·
            <span className="text-slate-400 ml-1">{scheduledCount} sắp</span> ·
            <span className="text-green-600 ml-1">{finishedCount} xong</span>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={updateLiveStatus}
            disabled={updatingStatus}
            className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-semibold px-3 py-2 rounded-lg flex items-center gap-1.5 transition-colors"
          >
            <span className={updatingStatus ? 'animate-spin inline-block' : ''}>⚡</span>
            {updatingStatus ? 'Đang cập nhật...' : 'Cập nhật trạng thái'}
          </button>
          <button
            onClick={syncGoals}
            disabled={syncingGoals}
            className="bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-sm font-semibold px-3 py-2 rounded-lg flex items-center gap-1.5 transition-colors"
          >
            <span className={syncingGoals ? 'animate-spin inline-block' : ''}>⚽</span>
            {syncingGoals ? '...' : 'Sync Goals'}
          </button>
          <button
            onClick={syncFromApi}
            disabled={syncing}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold px-3 py-2 rounded-lg flex items-center gap-1.5 transition-colors"
          >
            <span className={syncing ? 'animate-spin inline-block' : ''}>🔄</span>
            {syncing ? 'Đang sync...' : 'Sync lịch thi đấu'}
          </button>
          <button
            onClick={() => setAddOpen(true)}
            className="bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-3 py-2 rounded-lg transition-colors"
          >
            + Thêm trận
          </button>
          <Link
            href="/admin/users"
            className="bg-slate-600 hover:bg-slate-700 text-white text-sm font-semibold px-3 py-2 rounded-lg transition-colors"
          >
            Quản lý TK
          </Link>
          <Link
            href="/admin/create-users"
            className="bg-slate-800 hover:bg-slate-900 text-white text-sm font-semibold px-3 py-2 rounded-lg transition-colors"
          >
            + Tạo tài khoản
          </Link>
        </div>
      </div>

      {msg && (
        <div className={`rounded-lg px-4 py-3 text-sm font-medium ${
          msg.ok ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {msg.text}
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-2">
        {([['all', 'Tất cả'], ['scheduled', 'Sắp diễn ra'], ['live', `Live${liveCount > 0 ? ` (${liveCount})` : ''}`], ['finished', 'Đã xong']] as [string, string][]).map(([v, l]) => (
          <button
            key={v}
            onClick={() => setFilter(v as typeof filter)}
            className={`text-sm px-3 py-1.5 rounded-lg font-medium transition-colors ${
              filter === v
                ? v === 'live' ? 'bg-red-600 text-white' : 'bg-slate-800 text-white'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {l}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              {['Trận đấu', 'Thời gian', 'Giai đoạn', 'Trạng thái', 'Kết quả', 'Hành động'].map(h => (
                <th key={h} className="text-left text-xs text-slate-400 font-semibold px-4 py-3 whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filtered.map(m => (
              <tr key={m.id} className={`hover:bg-slate-50 transition-colors ${m.status === 'live' ? 'bg-red-50/40' : ''}`}>
                <td className="px-4 py-3 text-slate-800 font-medium whitespace-nowrap">
                  {m.home_team} <span className="text-slate-300 mx-1">vs</span> {m.away_team}
                </td>
                <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">
                  {fmtDateTime(m.match_time)}
                </td>
                <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">{STAGE_LABELS[m.stage] ?? m.stage}</td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    m.status === 'live' ? 'bg-red-100 text-red-600' :
                    m.status === 'finished' ? 'bg-green-100 text-green-700' :
                    m.status === 'cancelled' ? 'bg-slate-100 text-slate-400' :
                    'bg-slate-100 text-slate-500'
                  }`}>{m.status}</span>
                  {m.is_locked && <span className="ml-1 text-xs text-slate-400">🔒</span>}
                </td>
                <td className="px-4 py-3 text-slate-700 tabular-nums font-medium">
                  {m.home_score !== null ? `${m.home_score} – ${m.away_score}` : '—'}
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1 flex-wrap">
                    {/* Sửa — tất cả trừ cancelled */}
                    {m.status !== 'cancelled' && (
                      <button
                        onClick={() => setEditMatch(m)}
                        className={`text-xs px-2.5 py-1 rounded-md transition-colors ${
                          m.status === 'live'
                            ? 'bg-red-100 hover:bg-red-200 text-red-700 font-semibold'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        }`}
                      >
                        {m.status === 'live' ? '📊 Tỉ số' : 'Sửa'}
                      </button>
                    )}

                    {/* Khóa/Mở khoá — chỉ scheduled */}
                    {m.status === 'scheduled' && (
                      <button
                        onClick={() => toggleLock(m)}
                        className={`text-xs px-2.5 py-1 rounded-md transition-colors ${
                          m.is_locked
                            ? 'bg-amber-100 hover:bg-amber-200 text-amber-700'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        }`}
                      >
                        {m.is_locked ? 'Mở khoá' : 'Khoá'}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="text-center text-slate-400 py-12">Không có trận nào</div>
        )}
      </div>

      {(addOpen || editMatch) && (
        <MatchModal
          match={editMatch}
          onClose={() => { setAddOpen(false); setEditMatch(null) }}
          onSave={async (data) => {
            setSaving(true)
            if (editMatch) {
              await supabase.from('matches').update(data).eq('id', editMatch.id)
            } else {
              await supabase.from('matches').insert(data)
            }
            setSaving(false)
            setAddOpen(false)
            setEditMatch(null)
            await loadMatches()
          }}
          saving={saving}
        />
      )}
    </div>
  )
}

type MatchFormData = {
  home_team: string; away_team: string; match_time: string
  stage: string; group_name: string; venue: string
  status: string; home_score: number | null; away_score: number | null; is_locked: boolean
}

function MatchModal({ match, onClose, onSave, saving }: {
  match: Match | null; onClose: () => void; onSave: (data: MatchFormData) => void; saving: boolean
}) {
  const isLive = match?.status === 'live'
  const isFinished = match?.status === 'finished'

  const [form, setForm] = useState({
    home_team: match?.home_team ?? '',
    away_team: match?.away_team ?? '',
    match_time: match ? new Date(match.match_time).toISOString().slice(0, 16) : '',
    stage: match?.stage ?? 'group',
    group_name: match?.group_name ?? '',
    venue: match?.venue ?? '',
    status: match?.status ?? 'scheduled',
    home_score: match?.home_score ?? '',
    away_score: match?.away_score ?? '',
    is_locked: match?.is_locked ?? false,
  })
  const set = (k: string, v: string | number | boolean) => setForm(p => ({ ...p, [k]: v }))

  const showScore = form.status === 'live' || form.status === 'finished'

  return (
    <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
        <h2 className="text-lg font-bold text-slate-800 mb-4">
          {match ? (isLive ? '📊 Cập nhật tỉ số' : isFinished ? '✓ Sửa kết quả' : 'Sửa trận đấu') : 'Thêm trận mới'}
        </h2>

        <form
          onSubmit={e => {
            e.preventDefault()
            onSave({
              ...form,
              home_score: form.home_score !== '' ? Number(form.home_score) : null,
              away_score: form.away_score !== '' ? Number(form.away_score) : null,
            } as MatchFormData)
          }}
          className="space-y-3"
        >
          {/* Warning for finished: re-scoring not supported */}
          {isFinished && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-700">
              Trận đã kết thúc — điểm đã được tính tự động. Chỉ sửa nếu tỉ số bị sai.
            </div>
          )}

          {/* Score fields — shown first for live matches for quick access */}
          {showScore && (
            <div className="bg-slate-50 rounded-xl p-4 space-y-3 border border-slate-200">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Tỉ số</p>
              <div className="grid grid-cols-2 gap-3">
                {([['home_score', form.home_team || 'Đội nhà'], ['away_score', form.away_team || 'Đội khách']] as [keyof typeof form, string][]).map(([k, l]) => (
                  <div key={k}>
                    <label className="text-xs font-medium text-slate-600 block mb-1">{l}</label>
                    <input
                      type="number" min="0"
                      value={(form[k] as string | number) ?? ''}
                      onChange={e => set(k, e.target.value)}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-slate-800 text-lg font-bold text-center focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Metadata — hidden for live/finished (score is the focus) */}
          {!isLive && !isFinished && (
            <>
              <div className="grid grid-cols-2 gap-3">
                {([['home_team', 'Đội nhà'], ['away_team', 'Đội khách']] as [keyof typeof form, string][]).map(([k, l]) => (
                  <div key={k}>
                    <label className="text-xs font-medium text-slate-600 block mb-1">{l}</label>
                    <input value={form[k] as string} onChange={e => set(k, e.target.value)} required
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                  </div>
                ))}
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">Thời gian</label>
                <input type="datetime-local" value={form.match_time} onChange={e => set('match_time', e.target.value)} required
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-600 block mb-1">Giai đoạn</label>
                  <select value={form.stage} onChange={e => set('stage', e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-800 text-sm focus:outline-none">
                    {STAGES.map(s => <option key={s} value={s}>{STAGE_LABELS[s]}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 block mb-1">Tên bảng</label>
                  <input value={form.group_name} onChange={e => set('group_name', e.target.value)} placeholder="A, B..."
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">Sân vận động</label>
                <input value={form.venue} onChange={e => set('venue', e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
              </div>
            </>
          )}

          <div>
            <label className="text-xs font-medium text-slate-600 block mb-1">Trạng thái</label>
            <select value={form.status} onChange={e => set('status', e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-800 text-sm focus:outline-none">
              {['scheduled', 'live', 'finished', 'cancelled'].map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.is_locked} onChange={e => set('is_locked', e.target.checked)} className="rounded" />
            <span className="text-sm text-slate-600">Khóa dự đoán</span>
          </label>

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 border border-slate-300 hover:bg-slate-50 text-slate-700 py-2.5 rounded-lg text-sm font-medium transition-colors">
              Hủy
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg text-sm transition-colors">
              {saving ? 'Đang lưu...' : 'Lưu'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

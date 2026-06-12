'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth'
import type { Match } from '@/types'
import { format } from 'date-fns'
import { vi } from 'date-fns/locale'

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
  const [addOpen, setAddOpen] = useState(false)
  const [editMatch, setEditMatch] = useState<Match | null>(null)
  const [saving, setSaving] = useState(false)
  const [scoring, setScoring] = useState<string | null>(null)
  const [msg, setMsg] = useState('')

  useEffect(() => { init() }, [init])
  useEffect(() => {
    if (!loading && (!user || user.role !== 'admin')) router.replace('/')
  }, [user, loading, router])

  const loadMatches = async () => {
    const { data } = await supabase.from('matches').select('*').order('match_time')
    setMatches(data ?? [])
    setFetching(false)
  }

  useEffect(() => { if (user?.role === 'admin') loadMatches() }, [user])

  async function syncFromApi() {
    setSyncing(true)
    setMsg('')
    try {
      const res = await fetch('/api/sync-matches', { method: 'POST' })
      const json = await res.json()
      setMsg(json.message ?? 'Sync xong!')
      await loadMatches()
    } catch {
      setMsg('Lỗi khi sync')
    }
    setSyncing(false)
  }

  async function scoreMatch(matchId: string) {
    setScoring(matchId)
    const { error } = await supabase.rpc('score_match', { p_match_id: matchId })
    setMsg(error ? `Lỗi: ${error.message}` : 'Đã chấm điểm!')
    setScoring(null)
    await loadMatches()
  }

  async function toggleLock(match: Match) {
    await supabase.from('matches').update({ is_locked: !match.is_locked }).eq('id', match.id)
    setMatches(prev => prev.map(m => m.id === match.id ? { ...m, is_locked: !m.is_locked } : m))
  }

  if (loading || fetching) {
    return <div className="h-48 bg-gray-800 rounded-xl animate-pulse" />
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Admin Panel</h1>
        <div className="flex gap-2">
          <button
            onClick={syncFromApi}
            disabled={syncing}
            className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 rounded-lg"
          >
            {syncing ? 'Đang sync...' : '🔄 Sync API'}
          </button>
          <button
            onClick={() => setAddOpen(true)}
            className="bg-yellow-500 hover:bg-yellow-400 text-black text-sm font-semibold px-4 py-2 rounded-lg"
          >
            + Thêm trận
          </button>
        </div>
      </div>

      {msg && (
        <div className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-sm text-gray-300">
          {msg}
        </div>
      )}

      <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800">
              {['Trận đấu', 'Thời gian', 'Giai đoạn', 'Trạng thái', 'Kết quả', 'Hành động'].map(h => (
                <th key={h} className="text-left text-xs text-gray-400 font-medium px-4 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {matches.map(m => (
              <tr key={m.id} className="hover:bg-gray-800/50">
                <td className="px-4 py-3 text-white font-medium">
                  {m.home_team} vs {m.away_team}
                </td>
                <td className="px-4 py-3 text-gray-400 whitespace-nowrap">
                  {format(new Date(m.match_time), 'HH:mm dd/MM', { locale: vi })}
                </td>
                <td className="px-4 py-3 text-gray-400">{STAGE_LABELS[m.stage]}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    m.status === 'live' ? 'bg-red-900 text-red-300' :
                    m.status === 'finished' ? 'bg-green-900 text-green-300' :
                    'bg-gray-700 text-gray-300'
                  }`}>{m.status}</span>
                  {m.is_locked && <span className="ml-1 text-xs text-gray-500">🔒</span>}
                </td>
                <td className="px-4 py-3 text-white tabular-nums">
                  {m.home_score !== null ? `${m.home_score}–${m.away_score}` : '—'}
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    <button
                      onClick={() => setEditMatch(m)}
                      className="text-xs bg-gray-700 hover:bg-gray-600 text-white px-2 py-1 rounded"
                    >
                      Sửa
                    </button>
                    <button
                      onClick={() => toggleLock(m)}
                      className="text-xs bg-gray-700 hover:bg-gray-600 text-white px-2 py-1 rounded"
                    >
                      {m.is_locked ? 'Mở' : 'Khóa'}
                    </button>
                    {m.status === 'finished' && (
                      <button
                        onClick={() => scoreMatch(m.id)}
                        disabled={scoring === m.id}
                        className="text-xs bg-green-800 hover:bg-green-700 disabled:opacity-50 text-white px-2 py-1 rounded"
                      >
                        {scoring === m.id ? '...' : 'Chấm điểm'}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {matches.length === 0 && (
          <div className="text-center text-gray-500 py-12">Chưa có trận nào</div>
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

function MatchModal({ match, onClose, onSave, saving }: {
  match: Match | null
  onClose: () => void
  onSave: (data: any) => void
  saving: boolean
}) {
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

  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }))

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onSave({
      ...form,
      home_score: form.home_score !== '' ? Number(form.home_score) : null,
      away_score: form.away_score !== '' ? Number(form.away_score) : null,
    })
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-gray-900 rounded-2xl border border-gray-700 p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
        <h2 className="text-lg font-bold text-white mb-4">{match ? 'Sửa trận' : 'Thêm trận mới'}</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-400 block mb-1">Đội nhà</label>
              <input value={form.home_team} onChange={e => set('home_team', e.target.value)} required
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-yellow-500" />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Đội khách</label>
              <input value={form.away_team} onChange={e => set('away_team', e.target.value)} required
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-yellow-500" />
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">Thời gian</label>
            <input type="datetime-local" value={form.match_time} onChange={e => set('match_time', e.target.value)} required
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-yellow-500" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-400 block mb-1">Giai đoạn</label>
              <select value={form.stage} onChange={e => set('stage', e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none">
                {STAGES.map(s => <option key={s} value={s}>{STAGE_LABELS[s]}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Trạng thái</label>
              <select value={form.status} onChange={e => set('status', e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none">
                {['scheduled', 'live', 'finished', 'cancelled'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          {form.status === 'finished' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-400 block mb-1">Bàn đội nhà</label>
                <input type="number" min="0" value={form.home_score} onChange={e => set('home_score', e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-yellow-500" />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Bàn đội khách</label>
                <input type="number" min="0" value={form.away_score} onChange={e => set('away_score', e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-yellow-500" />
              </div>
            </div>
          )}
          <div className="flex items-center gap-2">
            <input type="checkbox" id="locked" checked={form.is_locked} onChange={e => set('is_locked', e.target.checked)}
              className="rounded" />
            <label htmlFor="locked" className="text-sm text-gray-300">Khóa dự đoán</label>
          </div>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-lg text-sm">
              Hủy
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 text-black font-semibold py-2 rounded-lg text-sm">
              {saving ? 'Đang lưu...' : 'Lưu'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

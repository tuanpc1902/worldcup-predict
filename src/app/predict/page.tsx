'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth'
import { fmtTime, fmtDate, isStarted } from '@/lib/time'
import FlagImg from '@/components/FlagImg'
import { isPlaceholder } from '@/lib/team-utils'
import LazyList from '@/components/LazyList'
import { MatchCardSkeleton } from '@/components/Skeleton'
import type { RealtimePostgresUpdatePayload } from '@supabase/supabase-js'
import type { Match, Prediction } from '@/types'

const STAGE_LABELS: Record<string, string> = {
  group: 'Vòng bảng', round_of_32: 'Vòng 1/16', round_of_16: 'Vòng 1/8',
  quarter: 'Tứ kết', semi: 'Bán kết', final: 'Chung kết',
}

export default function PredictPage() {
  const { user, init, loading } = useAuthStore()
  const router = useRouter()
  const supabase = createClient()

  const [matches, setMatches] = useState<Match[]>([])
  const [predictions, setPredictions] = useState<Record<string, Prediction>>({})
  const [inputs, setInputs] = useState<Record<string, { home: string; away: string }>>({})
  const [saving, setSaving] = useState<string | null>(null)
  const [saved, setSaved] = useState<string | null>(null)
  const [savingAll, setSavingAll] = useState(false)
  const [savedAll, setSavedAll] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => { init() }, [init])
  useEffect(() => {
    if (!loading && !user) router.replace('/login')
    if (!loading && user?.role === 'admin') router.replace('/admin')
  }, [user, loading, router])

  // Update "now" every 30 seconds to refresh lock state
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    if (!user) return
    async function load() {
      setFetching(true)
      const [{ data: ms }, { data: ps }] = await Promise.all([
        supabase.from('matches').select('*').neq('status', 'cancelled').order('match_time', { ascending: true }),
        supabase.from('predictions').select('*').eq('user_id', user!.id),
      ])
      // Filter out knockout matches whose teams are still TBD placeholders
      const matchList = (ms ?? []).filter(
        (m: Match) => !isPlaceholder(m.home_team) && !isPlaceholder(m.away_team)
      )
      const predMap: Record<string, Prediction> = {}
      const inputMap: Record<string, { home: string; away: string }> = {}
      ;(ps ?? []).forEach((p: Prediction) => { predMap[p.match_id] = p })
      matchList.forEach((m: Match) => {
        inputMap[m.id] = predMap[m.id]
          ? { home: String(predMap[m.id].predicted_home), away: String(predMap[m.id].predicted_away) }
          : { home: '', away: '' }
      })
      setMatches(matchList)
      setPredictions(predMap)
      setInputs(inputMap)
      setFetching(false)
    }
    load()

    // Realtime: update scores + status for live/finished matches
    const channel = supabase
      .channel('predict-matches-live')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'matches' },
        (payload: RealtimePostgresUpdatePayload<Match>) => {
          const updated = payload.new
          setMatches(prev => prev.map(m => m.id === updated.id ? { ...m, ...updated } : m))
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [user])

  async function saveAll() {
    if (savingAll) return
    const toSave = unlocked.filter(m => {
      const inp = inputs[m.id]
      return inp?.home !== '' && inp?.away !== ''
    })
    if (toSave.length === 0) return
    setSavingAll(true)
    const rows = toSave.map(m => ({
      user_id: user!.id,
      match_id: m.id,
      predicted_home: parseInt(inputs[m.id].home),
      predicted_away: parseInt(inputs[m.id].away),
    }))
    const { error } = await supabase.from('predictions').upsert(rows, { onConflict: 'user_id,match_id' })
    if (!error) {
      const newPreds = { ...predictions }
      rows.forEach(r => { newPreds[r.match_id] = { ...r, id: '', points_earned: null, scored_at: null, created_at: '' } })
      setPredictions(newPreds)
      setSavedAll(true)
      setTimeout(() => setSavedAll(false), 3000)
    }
    setSavingAll(false)
  }

  async function savePrediction(matchId: string) {
    const inp = inputs[matchId]
    if (inp.home === '' || inp.away === '') return
    const h = parseInt(inp.home), a = parseInt(inp.away)
    if (isNaN(h) || isNaN(a) || h < 0 || a < 0) return
    setSaving(matchId)
    const { error } = await supabase.from('predictions').upsert(
      { user_id: user!.id, match_id: matchId, predicted_home: h, predicted_away: a },
      { onConflict: 'user_id,match_id' }
    )
    if (!error) {
      setPredictions(prev => ({ ...prev, [matchId]: { id: '', user_id: user!.id, match_id: matchId, predicted_home: h, predicted_away: a, points_earned: null, scored_at: null, created_at: '' } }))
      setSaved(matchId)
      setTimeout(() => setSaved(null), 2000)
    }
    setSaving(null)
  }

  if (loading || fetching) {
    return (
      <div className="max-w-2xl mx-auto space-y-3">
        <div className="h-8 w-32 bg-slate-200 rounded animate-pulse" />
        {[...Array(4)].map((_, i) => <MatchCardSkeleton key={i} />)}
      </div>
    )
  }

  // A match is locked if finished, live, DB flag set, or kick-off time has passed
  const isLocked = (m: Match) =>
    m.status === 'finished' || m.status === 'live' || m.is_locked || now >= new Date(m.match_time).getTime()

  const unlocked = matches.filter(m => !isLocked(m))
  const locked = matches.filter(m => isLocked(m))

  return (
    <div className="max-w-2xl mx-auto space-y-6 fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Dự đoán</h1>
        <div className="flex flex-wrap gap-2 mt-2">
          <span className="text-xs bg-green-100 text-green-700 px-2.5 py-1 rounded-full font-medium">+5 pts đúng tỉ số</span>
          <span className="text-xs bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full font-medium">+3 pts đúng kết quả</span>
          <span className="text-xs bg-red-100 text-red-700 px-2.5 py-1 rounded-full font-medium">-1 pt sai</span>
        </div>
      </div>

      {unlocked.length === 0 && locked.length === 0 && (
        <div className="text-center bg-white rounded-2xl border border-slate-200 py-20">
          <p className="text-4xl mb-3">📅</p>
          <p className="text-slate-500">Không có trận nào để dự đoán.</p>
        </div>
      )}

      {unlocked.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
              Mở dự đoán · {unlocked.length} trận
            </h2>
            <button
              onClick={saveAll}
              disabled={savingAll}
              className={`text-sm font-semibold px-4 py-1.5 rounded-lg transition-colors ${
                savedAll
                  ? 'bg-green-100 text-green-700'
                  : 'bg-green-600 hover:bg-green-700 text-white disabled:opacity-50'
              }`}
            >
              {savingAll ? 'Đang lưu...' : savedAll ? '✓ Đã lưu tất cả' : 'Lưu tất cả'}
            </button>
          </div>
          {unlocked.map(match => {
            const pred = predictions[match.id]
            return (
              <div key={match.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                {/* Match info */}
                <div className="px-4 pt-4 pb-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-slate-400 font-medium">
                      {STAGE_LABELS[match.stage]}{match.group_name && ` · ${match.group_name}`}
                    </span>
                    <span className="text-xs text-slate-400">
                      {fmtTime(match.match_time)} · {fmtDate(match.match_time)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    {/* Home */}
                    <div className="flex items-center gap-2 flex-1">
                      <FlagImg team={match.home_team} flag={match.home_flag} size="sm" />
                      <span className="font-semibold text-slate-800 text-sm truncate">{match.home_team}</span>
                    </div>
                    <span className="text-xs text-slate-300 font-bold flex-shrink-0">vs</span>
                    {/* Away */}
                    <div className="flex items-center gap-2 flex-1 justify-end">
                      <span className="font-semibold text-slate-800 text-sm truncate text-right">{match.away_team}</span>
                      <FlagImg team={match.away_team} flag={match.away_flag} size="sm" />
                    </div>
                  </div>
                </div>

                {/* Input row — 3-col grid so score inputs are always centered */}
                <div className="px-4 pb-4 grid grid-cols-[1fr_auto_1fr] items-center gap-2 border-t border-slate-100 pt-3 bg-slate-50/50">
                  {/* Left: saved label */}
                  <div className="flex justify-start">
                    {pred && (
                      <span className="text-xs text-slate-400 whitespace-nowrap">
                        Đã lưu: <span className="text-slate-600 font-semibold">{pred.predicted_home}–{pred.predicted_away}</span>
                      </span>
                    )}
                  </div>

                  {/* Center: score inputs — always centered */}
                  <div className="flex items-center gap-2">
                    <input
                      type="number" min="0" max="20"
                      value={inputs[match.id]?.home ?? ''}
                      onChange={e => setInputs(p => ({ ...p, [match.id]: { ...p[match.id], home: e.target.value } }))}
                      placeholder="0"
                      className="w-12 text-center border border-slate-300 rounded-lg py-1.5 text-slate-800 text-lg font-bold focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                    />
                    <span className="text-slate-300 font-bold">–</span>
                    <input
                      type="number" min="0" max="20"
                      value={inputs[match.id]?.away ?? ''}
                      onChange={e => setInputs(p => ({ ...p, [match.id]: { ...p[match.id], away: e.target.value } }))}
                      placeholder="0"
                      className="w-12 text-center border border-slate-300 rounded-lg py-1.5 text-slate-800 text-lg font-bold focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                    />
                  </div>

                  {/* Right: save button */}
                  <div className="flex justify-end">
                    <button
                      onClick={() => savePrediction(match.id)}
                      disabled={saving === match.id || !inputs[match.id]?.home || !inputs[match.id]?.away}
                      className={`px-4 py-1.5 rounded-lg font-semibold text-sm transition-colors ${
                        saved === match.id
                          ? 'bg-green-100 text-green-700'
                          : 'bg-green-600 hover:bg-green-700 text-white disabled:opacity-40'
                      }`}
                    >
                      {saved === match.id ? '✓' : saving === match.id ? '...' : pred ? 'Cập nhật' : 'Lưu'}
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </section>
      )}

      {locked.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-3">
            Đã khoá · {locked.length} trận
          </h2>
          <div className="space-y-2">
            <LazyList
              items={locked}
              pageSize={20}
              renderItem={(match) => {
                const pred = predictions[match.id]
                const isFinishedMatch = match.status === 'finished'
                const pts = pred?.points_earned
                const ptsColor =
                  pts === 5 ? 'bg-green-100 text-green-700' :
                  pts === 3 ? 'bg-blue-100 text-blue-700' :
                  pts === -1 ? 'bg-red-100 text-red-600' :
                  'bg-slate-100 text-slate-500'
                return (
                  <div key={match.id} className={`bg-white rounded-xl border px-4 py-3 flex items-center gap-3 ${isFinishedMatch ? 'border-slate-200' : 'border-slate-100 opacity-60'}`}>
                    <div className="flex items-center gap-1.5 flex-1 min-w-0">
                      <FlagImg team={match.home_team} flag={match.home_flag} size="xs" />
                      <span className="text-sm font-medium text-slate-700 truncate">{match.home_team}</span>
                    </div>

                    <div className="text-center flex-shrink-0 min-w-[60px]">
                      {isFinishedMatch && match.home_score !== null ? (
                        <div className="text-sm font-black text-slate-800 tabular-nums">
                          {match.home_score}–{match.away_score}
                        </div>
                      ) : (
                        <>
                          <div className="text-xs font-bold text-slate-500">{fmtTime(match.match_time)}</div>
                          <div className="text-xs text-slate-400">{fmtDate(match.match_time)}</div>
                        </>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 flex-1 min-w-0 justify-end">
                      <span className="text-sm font-medium text-slate-700 truncate text-right">{match.away_team}</span>
                      <FlagImg team={match.away_team} flag={match.away_flag} size="xs" />
                    </div>

                    <div className="flex items-center gap-1.5 flex-shrink-0 ml-1">
                      {pred ? (
                        <span className={`text-xs px-2 py-0.5 rounded-lg font-semibold ${ptsColor}`}>
                          {pred.predicted_home}–{pred.predicted_away}
                          {pts !== null && pts !== undefined && (
                            <span className="ml-1">{pts > 0 ? `+${pts}` : pts}pt</span>
                          )}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-300 italic">Chưa đoán</span>
                      )}
                    </div>
                  </div>
                )
              }}
            />
          </div>
        </section>
      )}
    </div>
  )
}

'use client'
import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import FlagImg from '@/components/FlagImg'
import Link from 'next/link'
import type { H2HResult } from '@/types'

interface ProfileSummary {
  id: string
  display_name: string
  total_points: number
}

interface PredB {
  match_id: string
  predicted_home: number
  predicted_away: number
  points_earned: number | null
}

function H2HContent() {
  const params = useSearchParams()
  const supabase = createClient()

  const [profiles, setProfiles] = useState<ProfileSummary[]>([])
  const [userA, setUserA] = useState(params.get('a') ?? '')
  const [userB, setUserB] = useState(params.get('b') ?? '')
  const [results, setResults] = useState<H2HResult[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)

  useEffect(() => {
    supabase.from('profiles').select('id, display_name, total_points').order('total_points', { ascending: false })
      .then(({ data }: { data: ProfileSummary[] | null }) => setProfiles(data ?? []))
  }, [])

  useEffect(() => {
    if (userA && userB) compare()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function compare() {
    if (!userA || !userB || userA === userB) return
    setLoading(true)
    setSearched(true)

    const [{ data: predsA }, { data: predsB }] = await Promise.all([
      supabase.from('predictions')
        .select('match_id, predicted_home, predicted_away, points_earned, matches(home_team, away_team, home_flag, away_flag, match_time, home_score, away_score, status)')
        .eq('user_id', userA),
      supabase.from('predictions')
        .select('match_id, predicted_home, predicted_away, points_earned')
        .eq('user_id', userB),
    ])

    const bMap = new Map<string, PredB>(
      ((predsB ?? []) as PredB[]).map(p => [p.match_id, p])
    )

    const combined: H2HResult[] = ((predsA ?? []) as H2HResult[])
      .map(a => ({ ...a, b: bMap.get(a.match_id) }))
      .filter(r => r.b && r.matches?.status === 'finished')
      .sort((x, y) => new Date(y.matches.match_time).getTime() - new Date(x.matches.match_time).getTime())

    setResults(combined)
    setLoading(false)
  }

  const profA = profiles.find(p => p.id === userA)
  const profB = profiles.find(p => p.id === userB)

  const scoreA = results.reduce((s, r) => s + (r.points_earned ?? 0), 0)
  const scoreB = results.reduce((s, r) => s + (r.b?.points_earned ?? 0), 0)
  const winsA = results.filter(r => (r.points_earned ?? 0) > (r.b?.points_earned ?? 0)).length
  const winsB = results.filter(r => (r.b?.points_earned ?? 0) > (r.points_earned ?? 0)).length
  const draws = results.filter(r => (r.points_earned ?? 0) === (r.b?.points_earned ?? 0)).length

  return (
    <div className="max-w-2xl mx-auto space-y-5 pb-20 fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">⚔️ Head-to-head</h1>
        <p className="text-slate-500 text-sm mt-1">So sánh dự đoán giữa hai người chơi</p>
      </div>

      {/* Selector */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          {([
            { label: 'Người chơi A', value: userA, set: setUserA },
            { label: 'Người chơi B', value: userB, set: setUserB },
          ] as const).map(({ label, value, set }) => (
            <div key={label}>
              <label className="text-xs font-semibold text-slate-500 mb-1 block">{label}</label>
              <select
                value={value}
                onChange={e => set(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="">-- Chọn --</option>
                {profiles.map(p => (
                  <option key={p.id} value={p.id}>{p.display_name} ({p.total_points} pts)</option>
                ))}
              </select>
            </div>
          ))}
        </div>
        <button
          onClick={compare}
          disabled={!userA || !userB || userA === userB || loading}
          className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl transition-colors"
        >
          {loading ? 'Đang so sánh...' : 'So sánh'}
        </button>
      </div>

      {/* Summary */}
      {searched && !loading && profA && profB && results.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <div className="flex items-center justify-between">
            <div className="flex-1 text-center">
              <Link href={`/profile/${userA}`} className="text-lg font-black text-slate-800 hover:text-green-600">{profA.display_name}</Link>
              <div className={`text-4xl font-black mt-1 ${scoreA > scoreB ? 'text-green-600' : 'text-slate-400'}`}>{scoreA}</div>
              <div className="text-xs text-slate-400">{winsA} trận thắng</div>
            </div>
            <div className="text-center px-4">
              <div className="text-slate-300 text-xl font-black">VS</div>
              <div className="text-xs text-slate-400 mt-1">{draws} hòa</div>
            </div>
            <div className="flex-1 text-center">
              <Link href={`/profile/${userB}`} className="text-lg font-black text-slate-800 hover:text-green-600">{profB.display_name}</Link>
              <div className={`text-4xl font-black mt-1 ${scoreB > scoreA ? 'text-green-600' : 'text-slate-400'}`}>{scoreB}</div>
              <div className="text-xs text-slate-400">{winsB} trận thắng</div>
            </div>
          </div>
          <div className="mt-4 flex h-2 rounded-full overflow-hidden">
            <div className="bg-green-500 transition-all" style={{ width: `${(winsA / Math.max(results.length, 1)) * 100}%` }} />
            <div className="bg-slate-200 transition-all" style={{ width: `${(draws / Math.max(results.length, 1)) * 100}%` }} />
            <div className="bg-blue-400 transition-all" style={{ width: `${(winsB / Math.max(results.length, 1)) * 100}%` }} />
          </div>
        </div>
      )}

      {/* Match by match */}
      {searched && !loading && results.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100">
            <h2 className="font-bold text-sm text-slate-700">Từng trận · {results.length} trận đã kết thúc</h2>
          </div>
          <div className="divide-y divide-slate-50">
            {results.map(r => {
              const m = r.matches
              const ptA = r.points_earned ?? 0
              const ptB = r.b?.points_earned ?? 0
              const winner = ptA > ptB ? 'a' : ptB > ptA ? 'b' : 'draw'
              return (
                <Link key={r.match_id} href={`/matches/${r.match_id}`} className="flex items-center gap-2 px-4 py-3 hover:bg-slate-50 transition-colors">
                  <div className={`w-10 text-center text-sm font-black tabular-nums rounded-lg py-0.5 flex-shrink-0 ${winner === 'a' ? 'bg-green-100 text-green-700' : 'text-slate-400'}`}>
                    {r.predicted_home}–{r.predicted_away}
                  </div>
                  <div className="flex-1 flex items-center gap-1.5 min-w-0 justify-center">
                    <FlagImg team={m.home_team} flag={m.home_flag} size="xs" />
                    <span className="text-xs text-slate-600 font-semibold tabular-nums">{m.home_score}–{m.away_score}</span>
                    <FlagImg team={m.away_team} flag={m.away_flag} size="xs" />
                  </div>
                  <div className={`w-10 text-center text-sm font-black tabular-nums rounded-lg py-0.5 flex-shrink-0 ${winner === 'b' ? 'bg-blue-100 text-blue-700' : 'text-slate-400'}`}>
                    {r.b?.predicted_home}–{r.b?.predicted_away}
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <span className={`text-xs font-bold w-8 text-center px-1 py-0.5 rounded ${winner === 'a' ? 'bg-green-100 text-green-700' : 'bg-slate-50 text-slate-400'}`}>
                      {ptA > 0 ? '+' : ''}{ptA}
                    </span>
                    <span className={`text-xs font-bold w-8 text-center px-1 py-0.5 rounded ${winner === 'b' ? 'bg-blue-100 text-blue-700' : 'bg-slate-50 text-slate-400'}`}>
                      {ptB > 0 ? '+' : ''}{ptB}
                    </span>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {searched && !loading && results.length === 0 && (
        <div className="text-center bg-white rounded-2xl border border-slate-200 py-16">
          <p className="text-3xl mb-2">🤷</p>
          <p className="text-slate-500 text-sm">Không có trận nào cả hai cùng dự đoán</p>
        </div>
      )}
    </div>
  )
}

export default function H2HPage() {
  return (
    <Suspense>
      <H2HContent />
    </Suspense>
  )
}

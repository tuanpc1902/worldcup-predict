'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

interface MatchStat {
  id: string
  home_team: string
  away_team: string
  total_predicted: number
  exact_count: number
  correct_count: number
  wrong_count: number
  participation_rate: number
}

interface DailyStat { date: string; count: number }
interface PointDist { bucket: string; count: number }

export default function AdminStatsPage() {
  const supabase = createClient()
  const [totalUsers, setTotalUsers] = useState(0)
  const [totalPredictions, setTotalPredictions] = useState(0)
  const [dailyStats, setDailyStats] = useState<DailyStat[]>([])
  const [matchStats, setMatchStats] = useState<MatchStat[]>([])
  const [pointDist, setPointDist] = useState<PointDist[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [
        { count: userCount },
        { count: predCount },
        { data: preds },
        { data: matches },
        { data: profiles },
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'user'),
        supabase.from('predictions').select('*', { count: 'exact', head: true }),
        supabase.from('predictions').select('created_at, points_earned, match_id'),
        supabase.from('matches').select('id, home_team, away_team, status').order('match_time'),
        supabase.from('profiles').select('total_points').eq('role', 'user'),
      ])

      setTotalUsers(userCount ?? 0)
      setTotalPredictions(predCount ?? 0)

      const dayMap: Record<string, number> = {}
      for (const p of preds ?? []) {
        const day = (p as { created_at: string }).created_at.slice(0, 10)
        dayMap[day] = (dayMap[day] ?? 0) + 1
      }
      setDailyStats(Object.entries(dayMap).sort(([a], [b]) => a.localeCompare(b)).map(([date, count]) => ({ date, count })))

      const predsByMatch: Record<string, { total: number; exact: number; correct: number; wrong: number }> = {}
      for (const p of preds ?? []) {
        const pr = p as { match_id: string; points_earned: number | null }
        if (!predsByMatch[pr.match_id]) predsByMatch[pr.match_id] = { total: 0, exact: 0, correct: 0, wrong: 0 }
        predsByMatch[pr.match_id].total++
        if ((pr.points_earned ?? 0) >= 5) predsByMatch[pr.match_id].exact++
        else if ((pr.points_earned ?? 0) === 3) predsByMatch[pr.match_id].correct++
        else if ((pr.points_earned ?? 0) === -1) predsByMatch[pr.match_id].wrong++
      }
      const uCount = userCount ?? 1
      const ms: MatchStat[] = (matches ?? [])
        .filter((m: { status: string }) => m.status === 'finished')
        .map((m: { id: string; home_team: string; away_team: string }) => {
          const s = predsByMatch[m.id] ?? { total: 0, exact: 0, correct: 0, wrong: 0 }
          return { id: m.id, home_team: m.home_team, away_team: m.away_team, total_predicted: s.total, exact_count: s.exact, correct_count: s.correct, wrong_count: s.wrong, participation_rate: Math.round((s.total / uCount) * 100) }
        })
        .sort((a: MatchStat, b: MatchStat) => b.participation_rate - a.participation_rate)
      setMatchStats(ms)

      const labels = ['< 0', '0-20', '21-40', '41-60', '61-80', '81-100', '> 100']
      const buckets: Record<string, number> = {}
      labels.forEach(l => { buckets[l] = 0 })
      for (const p of profiles ?? []) {
        const pts = (p as { total_points: number }).total_points
        if (pts < 0) buckets['< 0']++
        else if (pts <= 20) buckets['0-20']++
        else if (pts <= 40) buckets['21-40']++
        else if (pts <= 60) buckets['41-60']++
        else if (pts <= 80) buckets['61-80']++
        else if (pts <= 100) buckets['81-100']++
        else buckets['> 100']++
      }
      setPointDist(labels.map(bucket => ({ bucket, count: buckets[bucket] })))
      setLoading(false)
    }
    load()
  }, [])

  const maxDaily = Math.max(...dailyStats.map(d => d.count), 1)
  const maxBucket = Math.max(...pointDist.map(d => d.count), 1)

  if (loading) return <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-32 bg-slate-100 rounded-xl animate-pulse" />)}</div>

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-bold text-slate-800">Thong ke nang cao</h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Nguoi choi', value: totalUsers, icon: '👥', color: 'text-blue-600' },
          { label: 'Du doan', value: totalPredictions, icon: '🎯', color: 'text-green-600' },
          { label: 'TB/nguoi', value: totalUsers > 0 ? Math.round(totalPredictions / totalUsers) : 0, icon: '📊', color: 'text-amber-600' },
          { label: 'Tran da chot', value: matchStats.length, icon: '✅', color: 'text-slate-600' },
        ].map(s => (
          <div key={s.label} className="bg-white border border-slate-200 rounded-xl p-4">
            <div className="text-2xl mb-1">{s.icon}</div>
            <div className={`text-2xl font-black ${s.color}`}>{s.value}</div>
            <div className="text-xs text-slate-500">{s.label}</div>
          </div>
        ))}
      </div>
      {dailyStats.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h3 className="text-sm font-bold text-slate-600 mb-4">Du doan theo ngay</h3>
          <div className="flex items-end gap-0.5 h-24">
            {dailyStats.slice(-30).map(d => (
              <div key={d.date} className="flex-1 group relative flex flex-col justify-end" title={d.date+': '+d.count}>
                <div className="absolute -top-6 text-xs bg-white border border-slate-200 px-1.5 py-0.5 rounded shadow opacity-0 group-hover:opacity-100 whitespace-nowrap z-10 text-slate-600">
                  {d.date.slice(5)}: {d.count}
                </div>
                <div className="w-full bg-green-400 rounded-t" style={{ height: String(Math.max(2, Math.round(d.count / maxDaily * 88)))+'px' }} />
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <h3 className="text-sm font-bold text-slate-600 mb-4">Phan bo diem nguoi choi</h3>
        <div className="space-y-2">
          {pointDist.map(d => (
            <div key={d.bucket} className="flex items-center gap-3">
              <span className="text-xs text-slate-500 w-16 text-right shrink-0">{d.bucket} pts</span>
              <div className="flex-1 h-5 bg-slate-50 rounded overflow-hidden">
                <div className="h-full bg-blue-400 rounded" style={{ width: String(Math.round(d.count / maxBucket * 100))+'%' }} />
              </div>
              <span className="text-xs text-slate-600 w-6 shrink-0">{d.count}</span>
            </div>
          ))}
        </div>
      </div>
      {matchStats.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-600">Tung tran da ket thuc</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-xs font-semibold">
                  <th className="text-left text-slate-400 px-4 py-2">Tran</th>
                  <th className="text-center text-slate-400 px-2 py-2">Tham gia</th>
                  <th className="text-center text-green-500 px-2 py-2">Dung TS</th>
                  <th className="text-center text-blue-500 px-2 py-2">Dung KQ</th>
                  <th className="text-center text-red-400 px-2 py-2">Sai</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {matchStats.map(m => (
                  <tr key={m.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2 text-slate-700 text-xs">{m.home_team} vs {m.away_team}</td>
                    <td className="px-2 py-2 text-center">
                      <span className={"text-xs font-bold "+(m.participation_rate >= 70 ? 'text-green-600' : m.participation_rate >= 40 ? 'text-amber-600' : 'text-red-500')}>
                        {m.participation_rate}%
                      </span>
                    </td>
                    <td className="px-2 py-2 text-center text-xs font-bold text-green-600">{m.exact_count}</td>
                    <td className="px-2 py-2 text-center text-xs font-bold text-blue-500">{m.correct_count}</td>
                    <td className="px-2 py-2 text-center text-xs font-bold text-red-400">{m.wrong_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

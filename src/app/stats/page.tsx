'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth'
import { getFlagUrl } from '@/lib/flag-map'

export default function StatsPage() {
  const { user, init, loading } = useAuthStore()
  const router = useRouter()
  const supabase = createClient()
  const [data, setData] = useState<any[]>([])
  const [fetching, setFetching] = useState(true)

  useEffect(() => { init() }, [init])
  useEffect(() => { if (!loading && !user) router.replace('/login') }, [user, loading, router])

  useEffect(() => {
    if (!user) return
    supabase.from('predictions').select('*, match:matches(*)')
      .eq('user_id', user.id)
      .not('points_earned', 'is', null)
      .then(({ data: d }: { data: any }) => { setData(d ?? []); setFetching(false) })
  }, [user])

  if (loading || fetching) return (
    <div className="space-y-3">{[...Array(4)].map((_, i) => (
      <div key={i} className="h-24 bg-white rounded-xl border border-slate-200 animate-pulse" />
    ))}</div>
  )

  const total = data.length
  const exact = data.filter(d => d.points_earned === 5)
  const correct = data.filter(d => d.points_earned === 3)
  const wrong = data.filter(d => d.points_earned === -1)
  const totalPts = data.reduce((s, d) => s + (d.points_earned ?? 0), 0)
  const pct = total > 0 ? Math.round(((exact.length + correct.length) / total) * 100) : 0

  // Streak
  const sorted = [...data].sort((a, b) => new Date(a.match.match_time).getTime() - new Date(b.match.match_time).getTime())
  let streak = 0, maxStreak = 0, cur = 0
  sorted.forEach(d => {
    if (d.points_earned > 0) { cur++; maxStreak = Math.max(maxStreak, cur) }
    else cur = 0
  })
  streak = cur

  // Team stats
  const teamStats: Record<string, { correct: number; total: number }> = {}
  data.forEach(d => {
    const team = d.match.home_team
    if (!teamStats[team]) teamStats[team] = { correct: 0, total: 0 }
    teamStats[team].total++
    if (d.points_earned > 0) teamStats[team].correct++
  })
  const bestTeams = Object.entries(teamStats)
    .filter(([, s]) => s.total >= 2)
    .sort(([, a], [, b]) => (b.correct / b.total) - (a.correct / a.total))
    .slice(0, 5)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">📊 Thống kê của tôi</h1>
        <p className="text-slate-500 text-sm mt-1">Phân tích độ chính xác dự đoán</p>
      </div>

      {/* Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Tổng điểm', value: totalPts, unit: 'pts', color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Độ chính xác', value: `${pct}%`, unit: '', color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Chuỗi hiện tại', value: streak, unit: '🔥', color: 'text-orange-500', bg: 'bg-orange-50' },
          { label: 'Chuỗi kỷ lục', value: maxStreak, unit: '⭐', color: 'text-amber-600', bg: 'bg-amber-50' },
        ].map(s => (
          <div key={s.label} className={`${s.bg} rounded-xl p-4 border border-slate-200`}>
            <div className={`text-2xl font-bold ${s.color}`}>{s.value} <span className="text-base">{s.unit}</span></div>
            <div className="text-xs text-slate-500 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Breakdown */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h2 className="text-sm font-bold text-slate-600 mb-4">Phân tích kết quả ({total} trận)</h2>
        <div className="space-y-3">
          {[
            { label: 'Đúng tỉ số', count: exact.length, color: 'bg-green-500', pts: '+5 pts' },
            { label: 'Đúng kết quả', count: correct.length, color: 'bg-blue-500', pts: '+3 pts' },
            { label: 'Sai', count: wrong.length, color: 'bg-red-400', pts: '-1 pt' },
          ].map(s => (
            <div key={s.label}>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-slate-600">{s.label}</span>
                <span className="text-slate-500">{s.count} trận · {s.pts}</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full ${s.color} rounded-full transition-all`}
                  style={{ width: total > 0 ? `${(s.count / total) * 100}%` : '0%' }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Best teams */}
      {bestTeams.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="text-sm font-bold text-slate-600 mb-4">Đội bạn đoán giỏi nhất</h2>
          <div className="space-y-2">
            {bestTeams.map(([team, s]) => {
              const flag = getFlagUrl(team)
              const pct = Math.round((s.correct / s.total) * 100)
              return (
                <div key={team} className="flex items-center gap-3">
                  {flag ? <img src={flag} alt={team} className="w-7 h-5 object-cover rounded shadow-sm" /> : <div className="w-7 h-5 bg-slate-200 rounded" />}
                  <span className="text-sm text-slate-700 flex-1">{team}</span>
                  <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-green-500 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-xs text-slate-500 w-10 text-right">{pct}%</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {total === 0 && (
        <div className="text-center bg-white rounded-2xl border border-slate-200 py-16">
          <p className="text-4xl mb-3">📊</p>
          <p className="text-slate-500">Chưa có trận nào được chấm điểm.</p>
        </div>
      )}
    </div>
  )
}

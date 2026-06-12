'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { LeaderboardRowSkeleton } from '@/components/Skeleton'
import type { LeaderboardEntry } from '@/types'

export default function LeaderboardPage() {
  const supabase = createClient()
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)

  async function load() {
    const { data } = await supabase.from('leaderboard').select('*').limit(50)
    setEntries((data ?? []) as LeaderboardEntry[])
    setLoading(false)
  }

  useEffect(() => {
    load()
    // Realtime: re-fetch when profiles change (points updated)
    const channel = supabase
      .channel('leaderboard-realtime')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles' }, () => load())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  const medals = ['🥇', '🥈', '🥉']

  if (loading) return (
    <div className="space-y-6">
      <div className="h-8 w-48 bg-slate-200 rounded animate-pulse" />
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="h-36 bg-amber-50 animate-pulse border-b border-slate-100" />
        {[...Array(8)].map((_, i) => <LeaderboardRowSkeleton key={i} />)}
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">🏆 Bảng xếp hạng</h1>
          <p className="text-slate-500 text-sm mt-1 flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse inline-block" />
            Cập nhật realtime
          </p>
        </div>
      </div>

      {entries.length === 0 ? (
        <div className="text-center bg-white rounded-2xl border border-slate-200 py-20">
          <p className="text-4xl mb-3">🏆</p>
          <p className="text-slate-500">Chưa có dữ liệu. Hãy là người đầu tiên dự đoán!</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Top 3 podium */}
          {entries.length >= 2 && (
            <div className="grid grid-cols-3 gap-4 p-6 bg-gradient-to-b from-amber-50 to-white border-b border-slate-100">
              {[entries[1], entries[0], entries[2]].filter(Boolean).map((e, i) => {
                const actualRank = i === 0 ? 2 : i === 1 ? 1 : 3
                const sizes = ['mt-6', '', 'mt-6']
                const rings = ['ring-slate-300', 'ring-amber-400', 'ring-orange-300']
                return (
                  <div key={e.id} className={`flex flex-col items-center gap-1 ${sizes[i]}`}>
                    <div className={`w-12 h-12 rounded-full bg-green-100 ring-2 ${rings[i]} flex items-center justify-center text-lg font-bold text-green-700`}>
                      {e.display_name.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-xl">{medals[actualRank - 1]}</span>
                    <span className="text-slate-700 text-xs font-semibold text-center line-clamp-1">{e.display_name}</span>
                    <span className="text-green-600 font-bold text-sm">{e.total_points} pts</span>
                  </div>
                )
              })}
            </div>
          )}

          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                {['#', 'Người chơi', 'Điểm', 'Đúng tỉ số', 'Đúng KQ', 'Sai'].map(h => (
                  <th key={h} className="text-left text-xs text-slate-400 font-semibold px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {entries.map((e, idx) => (
                <tr key={e.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 text-sm w-10">{idx < 3 ? medals[idx] : <span className="text-slate-400">{idx + 1}</span>}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-sm font-bold text-green-700 flex-shrink-0">
                        {e.display_name.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-slate-800 text-sm font-medium">{e.display_name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`font-bold text-lg ${e.total_points > 0 ? 'text-green-600' : e.total_points < 0 ? 'text-red-500' : 'text-slate-400'}`}>
                      {e.total_points}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-green-600 text-sm font-medium">{e.exact_scores}</td>
                  <td className="px-4 py-3 text-blue-600 text-sm font-medium">{e.correct_results}</td>
                  <td className="px-4 py-3 text-red-500 text-sm font-medium">{e.wrong_predictions}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

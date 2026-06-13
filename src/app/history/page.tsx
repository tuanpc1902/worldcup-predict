'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth'
import MatchCard from '@/components/MatchCard'
import type { PredictionWithMatch } from '@/types'

export default function HistoryPage() {
  const { user, init, loading } = useAuthStore()
  const router = useRouter()
  const supabase = createClient()
  const [items, setItems] = useState<PredictionWithMatch[]>([])
  const [missedCount, setMissedCount] = useState(0)
  const [fetching, setFetching] = useState(true)

  useEffect(() => { init() }, [init])
  useEffect(() => {
    if (!loading && !user) router.replace('/login')
  }, [user, loading, router])

  useEffect(() => {
    if (!user) return
    supabase
      .from('predictions')
      .select('*, matches(*)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }: { data: PredictionWithMatch[] | null }) => {
        const all = data ?? []
        setMissedCount(all.filter(i => i.predicted_home === -1 && i.predicted_away === -1).length)
        setItems(all.filter(i => !(i.predicted_home === -1 && i.predicted_away === -1)))
        setFetching(false)
      })
  }, [user])

  const stats = {
    exact: items.filter(i => i.points_earned === 5).length,
    correct: items.filter(i => i.points_earned === 3).length,
    wrong: items.filter(i => i.points_earned === -1).length,
    pending: items.filter(i => i.points_earned === null).length,
  }

  if (loading || fetching) {
    return <div className="space-y-3">{[...Array(4)].map((_, i) => (
      <div key={i} className="h-24 bg-white rounded-xl border border-slate-200 animate-pulse" />
    ))}</div>
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">Lịch sử của tôi</h1>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: 'Đúng tỉ số', value: stats.exact, color: 'text-green-600', bg: 'bg-green-50', pts: '+5 pts' },
          { label: 'Đúng kết quả', value: stats.correct, color: 'text-blue-600', bg: 'bg-blue-50', pts: '+3 pts' },
          { label: 'Sai', value: stats.wrong, color: 'text-red-500', bg: 'bg-red-50', pts: '-1 pt' },
          { label: 'Bỏ qua', value: missedCount, color: 'text-orange-500', bg: 'bg-orange-50', pts: '-1 pt' },
          { label: 'Chờ kết quả', value: stats.pending, color: 'text-slate-500', bg: 'bg-slate-50', pts: '—' },
        ].map(s => (
          <div key={s.label} className={`${s.bg} rounded-xl p-4 border border-slate-200`}>
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-slate-500 mt-0.5">{s.label}</div>
            <div className="text-xs text-slate-400">{s.pts}</div>
          </div>
        ))}
      </div>

      {items.length === 0 ? (
        <div className="text-center bg-white rounded-2xl border border-slate-200 py-20">
          <p className="text-4xl mb-3">🎯</p>
          <p className="text-slate-500">Bạn chưa dự đoán trận nào.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map(item => (
            <MatchCard key={item.id} match={item.matches} prediction={item} showResult />
          ))}
        </div>
      )}
    </div>
  )
}

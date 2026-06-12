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
  const [fetching, setFetching] = useState(true)

  useEffect(() => { init() }, [init])
  useEffect(() => { if (!loading && !user) router.replace('/login') }, [user, loading, router])

  useEffect(() => {
    if (!user) return
    supabase
      .from('predictions')
      .select('*, match:matches(*)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }: { data: any }) => {
        setItems((data ?? []) as PredictionWithMatch[])
        setFetching(false)
      })
  }, [user])

  const stats = {
    total: items.length,
    exact: items.filter(i => i.points_earned === 5).length,
    correct: items.filter(i => i.points_earned === 3).length,
    wrong: items.filter(i => i.points_earned === -1).length,
    pending: items.filter(i => i.points_earned === null).length,
  }

  if (loading || fetching) {
    return <div className="space-y-3">{[...Array(4)].map((_, i) => (
      <div key={i} className="h-24 bg-gray-800 rounded-xl animate-pulse" />
    ))}</div>
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Lịch sử của tôi</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Đúng tỉ số', value: stats.exact, color: 'text-green-400', pts: '+5 pts' },
          { label: 'Đúng kết quả', value: stats.correct, color: 'text-blue-400', pts: '+3 pts' },
          { label: 'Sai', value: stats.wrong, color: 'text-red-400', pts: '-1 pt' },
          { label: 'Chờ kết quả', value: stats.pending, color: 'text-gray-400', pts: '—' },
        ].map(s => (
          <div key={s.label} className="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-gray-400 mt-0.5">{s.label}</div>
            <div className="text-xs text-gray-500">{s.pts}</div>
          </div>
        ))}
      </div>

      {/* List */}
      {items.length === 0 ? (
        <div className="text-center text-gray-500 py-20">
          <p className="text-4xl mb-3">🎯</p>
          <p>Bạn chưa dự đoán trận nào.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map(item => (
            <MatchCard key={item.id} match={item.match} prediction={item} showResult />
          ))}
        </div>
      )}
    </div>
  )
}

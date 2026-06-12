import { createServerSupabase } from '@/lib/supabase-server'
import MatchCard from '@/components/MatchCard'
import type { Match } from '@/types'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const supabase = await createServerSupabase()

  const { data: matches } = await supabase
    .from('matches')
    .select('*')
    .order('match_time', { ascending: true })
    .limit(40)

  const upcoming = (matches ?? []).filter((m: Match) => m.status === 'scheduled').slice(0, 8)
  const live = (matches ?? []).filter((m: Match) => m.status === 'live')
  const finished = (matches ?? []).filter((m: Match) => m.status === 'finished').slice(0, 6)

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="bg-gradient-to-br from-green-600 to-green-700 rounded-2xl p-8 text-white text-center shadow-lg">
        <div className="text-5xl mb-3">⚽</div>
        <h1 className="text-3xl font-bold mb-2">World Cup 2026</h1>
        <p className="text-green-100 mb-5">Dự đoán kết quả · Ghi điểm · Thách đấu đồng nghiệp</p>
        <Link
          href="/predict"
          className="inline-block bg-white text-green-700 font-bold px-6 py-2.5 rounded-xl hover:bg-green-50 transition-colors shadow"
        >
          Dự đoán ngay →
        </Link>
      </div>

      {/* Live matches */}
      {live.length > 0 && (
        <section>
          <h2 className="text-base font-bold text-red-500 mb-3 flex items-center gap-2">
            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            Đang diễn ra
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {live.map((m: Match) => <MatchCard key={m.id} match={m} />)}
          </div>
        </section>
      )}

      {/* Upcoming */}
      {upcoming.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-slate-700">📅 Sắp diễn ra</h2>
            <Link href="/predict" className="text-green-600 hover:underline text-sm font-medium">
              Dự đoán tất cả →
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {upcoming.map((m: Match) => <MatchCard key={m.id} match={m} />)}
          </div>
        </section>
      )}

      {/* Recent results */}
      {finished.length > 0 && (
        <section>
          <h2 className="text-base font-bold text-slate-700 mb-3">🏁 Kết quả gần đây</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {finished.map((m: Match) => <MatchCard key={m.id} match={m} showResult />)}
          </div>
        </section>
      )}

      {matches?.length === 0 && (
        <div className="text-center py-20 bg-white rounded-2xl border border-slate-200">
          <p className="text-4xl mb-3">📅</p>
          <p className="text-slate-500">Chưa có trận đấu nào.</p>
          <p className="text-slate-400 text-sm mt-1">Admin vào trang Admin → Sync API để tải lịch thi đấu.</p>
        </div>
      )}
    </div>
  )
}

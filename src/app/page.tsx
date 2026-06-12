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
    .limit(20)

  const upcoming = (matches ?? []).filter((m: Match) => m.status === 'scheduled').slice(0, 6)
  const live = (matches ?? []).filter((m: Match) => m.status === 'live')
  const finished = (matches ?? []).filter((m: Match) => m.status === 'finished').slice(0, 4)

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="text-center py-8">
        <h1 className="text-4xl font-bold text-white mb-2">
          ⚽ World Cup 2026
        </h1>
        <p className="text-gray-400">Dự đoán kết quả, ghi điểm, thách đấu đồng nghiệp!</p>
        <Link
          href="/predict"
          className="mt-4 inline-block bg-yellow-500 hover:bg-yellow-400 text-black font-bold px-6 py-2.5 rounded-xl transition-colors"
        >
          Dự đoán ngay →
        </Link>
      </div>

      {/* Live matches */}
      {live.length > 0 && (
        <section>
          <h2 className="text-lg font-bold text-red-400 mb-3 flex items-center gap-2">
            <span className="w-2 h-2 bg-red-400 rounded-full animate-pulse" />
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
          <h2 className="text-lg font-bold text-white mb-3">Sắp diễn ra</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {upcoming.map((m: Match) => <MatchCard key={m.id} match={m} />)}
          </div>
          <div className="mt-3 text-center">
            <Link href="/predict" className="text-yellow-400 hover:underline text-sm">
              Xem tất cả và dự đoán →
            </Link>
          </div>
        </section>
      )}

      {/* Recent results */}
      {finished.length > 0 && (
        <section>
          <h2 className="text-lg font-bold text-white mb-3">Kết quả gần đây</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {finished.map((m: Match) => <MatchCard key={m.id} match={m} showResult />)}
          </div>
        </section>
      )}

      {matches?.length === 0 && (
        <div className="text-center text-gray-500 py-20">
          <p className="text-4xl mb-3">📅</p>
          <p>Chưa có trận đấu nào. Admin hãy thêm lịch thi đấu.</p>
        </div>
      )}
    </div>
  )
}

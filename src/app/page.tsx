import { createServerSupabase } from '@/lib/supabase-server'
import MatchCard from '@/components/MatchCard'
import Countdown from '@/components/Countdown'
import LiveHero from '@/components/LiveHero'
import type { Match } from '@/types'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const supabase = await createServerSupabase()

  // Fetch live separately (no limit) + upcoming/finished with limit
  const [{ data: allMatches }, { data: liveRows }] = await Promise.all([
    supabase.from('matches').select('*').order('match_time', { ascending: true }).limit(60),
    supabase.from('matches').select('*').eq('status', 'live'),
  ])

  const now = new Date()

  // Time-based live: started but not marked finished yet (within 115 min of kick-off)
  const timeLive = ((allMatches ?? []) as Match[]).filter(m => {
    if (m.status === 'finished' || m.status === 'live') return false
    const kickoff = new Date(m.match_time)
    const elapsed = (now.getTime() - kickoff.getTime()) / 60000
    return elapsed >= 0 && elapsed <= 115
  })

  // Merge: DB-live + time-detected-live (deduplicate by id)
  const liveIds = new Set((liveRows ?? []).map((m: Match) => m.id))
  const live: Match[] = [
    ...(liveRows ?? []) as Match[],
    ...timeLive.filter(m => !liveIds.has(m.id)),
  ]

  const upcoming = ((allMatches ?? []) as Match[])
    .filter(m => m.status === 'scheduled' && !timeLive.find(l => l.id === m.id))
    .slice(0, 8)

  const finished = ((allMatches ?? []) as Match[])
    .filter(m => m.status === 'finished')
    .slice(-6)
    .reverse()

  const nextMatch = upcoming[0]

  return (
    <div className="space-y-6 fade-in">
      {/* Hero: live banner OR countdown to next match */}
      {live.length > 0 ? (
        <LiveHero matches={live} />
      ) : nextMatch ? (
        <Countdown
          matchId={nextMatch.id}
          matchTime={nextMatch.match_time}
          homeTeam={nextMatch.home_team}
          awayTeam={nextMatch.away_team}
          homeFlag={nextMatch.home_flag}
          awayFlag={nextMatch.away_flag}
        />
      ) : (
        <div className="rounded-2xl p-8 text-white text-center shadow-lg" style={{ background: 'var(--brand)' }}>
          <h1 className="text-3xl font-bold mb-2">World Cup 2026</h1>
          <p className="opacity-75 mb-5">Dự đoán kết quả · Ghi điểm</p>
          <Link href="/predict" className="inline-block bg-white font-bold px-6 py-2.5 rounded-xl hover:opacity-90 transition-opacity shadow" style={{ color: 'var(--brand)' }}>
            Dự đoán ngay
          </Link>
        </div>
      )}

      {/* Live section */}
      {live.length > 0 && (
        <section>
          <h2 className="text-base font-bold text-red-500 mb-3 flex items-center gap-2">
            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            Đang diễn ra · {live.length} trận
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
            <h2 className="text-base font-bold text-slate-700">Sắp diễn ra</h2>
            <Link href="/predict" className="text-sm font-medium" style={{ color: 'var(--brand)' }}>
              Dự đoán tất cả
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {upcoming.map((m: Match) => <MatchCard key={m.id} match={m} showPredictLink />)}
          </div>
        </section>
      )}

      {/* Recent results */}
      {finished.length > 0 && (
        <section>
          <h2 className="text-base font-bold text-slate-700 mb-3">Kết quả gần đây</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {finished.map((m: Match) => <MatchCard key={m.id} match={m} showResult />)}
          </div>
        </section>
      )}

      {allMatches?.length === 0 && (
        <div className="text-center py-20 bg-white rounded-2xl border border-slate-200">
          <p className="text-4xl mb-3">📅</p>
          <p className="text-slate-500">Chưa có trận đấu nào.</p>
          <p className="text-slate-400 text-sm mt-1">Admin → Sync API để tải lịch thi đấu.</p>
        </div>
      )}
    </div>
  )
}

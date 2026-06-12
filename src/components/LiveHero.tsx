'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import FlagImg from '@/components/FlagImg'
import type { Match } from '@/types'

interface Props { matches: Match[] }

function useElapsed(matchTime: string) {
  const [min, setMin] = useState(0)
  useEffect(() => {
    function calc() {
      const elapsed = Math.floor((Date.now() - new Date(matchTime).getTime()) / 60000)
      setMin(Math.max(0, Math.min(elapsed, 120)))
    }
    calc()
    const t = setInterval(calc, 30_000)
    return () => clearInterval(t)
  }, [matchTime])
  return min
}

function LiveMatchCard({ match }: { match: Match }) {
  const elapsed = useElapsed(match.match_time)
  const half = elapsed <= 45 ? '1' : elapsed <= 90 ? '2' : 'ET'
  const displayMin = elapsed <= 45 ? elapsed : elapsed <= 90 ? elapsed - 45 : elapsed - 90

  return (
    <Link
      href={`/matches/${match.id}`}
      className="flex items-center gap-4 p-4 rounded-xl border border-red-200/60 bg-white/10 hover:bg-white/20 transition-colors"
    >
      {/* Home */}
      <div className="flex-1 flex flex-col items-center gap-1.5 min-w-0">
        <FlagImg team={match.home_team} flag={match.home_flag} size="lg" />
        <p className="text-white font-semibold text-sm leading-tight text-center line-clamp-2 w-full px-1">
          {match.home_team}
        </p>
      </div>

      {/* Score */}
      <div className="flex-shrink-0 text-center space-y-1">
        <div className="text-3xl font-black text-white tabular-nums">
          {match.home_score ?? 0} – {match.away_score ?? 0}
        </div>
        <div className="flex items-center justify-center gap-1 text-xs text-red-200 font-semibold">
          <span className="w-1.5 h-1.5 bg-red-300 rounded-full animate-pulse" />
          H{half} {displayMin}&apos;
        </div>
      </div>

      {/* Away */}
      <div className="flex-1 flex flex-col items-center gap-1.5 min-w-0">
        <FlagImg team={match.away_team} flag={match.away_flag} size="lg" />
        <p className="text-white font-semibold text-sm leading-tight text-center line-clamp-2 w-full px-1">
          {match.away_team}
        </p>
      </div>
    </Link>
  )
}

export default function LiveHero({ matches }: Props) {
  return (
    <div className="rounded-2xl p-5 space-y-4 shadow-lg" style={{ background: 'linear-gradient(135deg, #8b0000 0%, #cc0000 50%, #8b0000 100%)' }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 bg-red-300 rounded-full animate-pulse" />
          <span className="text-white font-bold text-sm tracking-wide">ĐANG DIỄN RA</span>
        </div>
        <a
          href="https://vtvgo.vn/"
          target="_blank"
          rel="noopener noreferrer"
          onClick={e => e.stopPropagation()}
          className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors"
        >
          <span className="text-base leading-none">▶</span>
          Xem trực tiếp · VTVGo
        </a>
      </div>

      {/* Match cards */}
      <div className={`grid gap-3 ${matches.length > 1 ? 'sm:grid-cols-2' : ''}`}>
        {matches.map(m => <LiveMatchCard key={m.id} match={m} />)}
      </div>

      <p className="text-red-200/60 text-xs text-center">Nhấn vào trận để xem dự đoán cộng đồng</p>
    </div>
  )
}

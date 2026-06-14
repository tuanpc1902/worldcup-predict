'use client'
import { useState } from 'react'

interface ShareCardProps {
  data?: {
    homeTeam: string
    awayTeam: string
    homeScore?: number | null
    awayScore?: number | null
    predictedHome: number
    predictedAway: number
    pointsEarned?: number | null
  }
  // flat props (legacy calling convention from MatchDetailClient)
  homeTeam?: string
  awayTeam?: string
  homeScore?: number | null
  awayScore?: number | null
  predictedHome?: number
  predictedAway?: number
  pointsEarned?: number | null
  userName?: string
}

function getResultLabel(pts: number | null): string {
  if (pts === null) return 'Chờ kết quả'
  if (pts >= 8) return 'Đúng tỉ số + KQ! 🔥'
  if (pts >= 5) return 'Đúng tỉ số! 🎯'
  if (pts === 3) return 'Đúng kết quả ✅'
  return 'Chưa đúng 😓'
}

export default function ShareCard(props: ShareCardProps) {
  const [copied, setCopied] = useState(false)
  const d = props.data ?? {
    homeTeam: props.homeTeam ?? '',
    awayTeam: props.awayTeam ?? '',
    homeScore: props.homeScore,
    awayScore: props.awayScore,
    predictedHome: props.predictedHome ?? 0,
    predictedAway: props.predictedAway ?? 0,
    pointsEarned: props.pointsEarned,
  }
  const hasScore = d.homeScore !== null && d.homeScore !== undefined

  // Build OG image URL for rich preview when sharing link
  const ogParams = new URLSearchParams({
    home: d.homeTeam,
    away: d.awayTeam,
    ...(hasScore ? { hs: String(d.homeScore), as: String(d.awayScore) } : {}),
    ph: String(d.predictedHome),
    pa: String(d.predictedAway),
    ...(d.pointsEarned !== null && d.pointsEarned !== undefined ? { pts: String(d.pointsEarned) } : {}),
  })
  const shareUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/api/og?${ogParams}`

  const text = `⚽ Dự đoán của tôi: ${d.homeTeam} ${d.predictedHome}–${d.predictedAway} ${d.awayTeam}` +
    (hasScore ? `\nKết quả: ${d.homeScore}–${d.awayScore}` : '') +
    (d.pointsEarned !== null && d.pointsEarned !== undefined
      ? `\n${getResultLabel(d.pointsEarned)} (${d.pointsEarned > 0 ? '+' : ''}${d.pointsEarned} điểm)` : '') +
    `\n🏆 worldcup-bet.vercel.app`

  async function share() {
    if (navigator.share) {
      await navigator.share({ text, url: shareUrl }).catch(() => {})
    } else {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <button
      onClick={share}
      className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-green-600 transition-colors px-2 py-1 rounded-lg hover:bg-green-50"
      title="Chia sẻ dự đoán"
    >
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
      </svg>
      {copied ? 'Đã copy!' : 'Chia sẻ'}
    </button>
  )
}

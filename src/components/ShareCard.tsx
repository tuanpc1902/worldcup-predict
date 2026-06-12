'use client'
import { useRef, useState } from 'react'

interface Props {
  homeTeam: string
  awayTeam: string
  homeScore: number | null
  awayScore: number | null
  predictedHome: number
  predictedAway: number
  pointsEarned: number
  userName: string
}

export default function ShareCard({
  homeTeam, awayTeam, homeScore, awayScore,
  predictedHome, predictedAway, pointsEarned, userName,
}: Props) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [copied, setCopied] = useState(false)
  const [open, setOpen] = useState(false)

  const ptLabel = pointsEarned === 5 ? '🎯 Đúng tỉ số chính xác!' :
    pointsEarned === 3 ? '✅ Đúng kết quả!' :
    pointsEarned === -1 ? '❌ Sai kết quả' : '⏳ Chờ kết quả'

  const ptColor = pointsEarned === 5 ? '#16a34a' : pointsEarned === 3 ? '#2563eb' : '#dc2626'

  async function copyCard() {
    // Use the Web Share API if available, else copy text fallback
    const text = `⚽ World Cup 2026 - ${homeTeam} ${homeScore}–${awayScore} ${awayTeam}\n` +
      `🎯 Dự đoán của tôi: ${predictedHome}–${predictedAway}\n` +
      `${ptLabel} ${pointsEarned > 0 ? `+${pointsEarned}` : pointsEarned} điểm\n` +
      `Chơi tại: worldcup-predict.vercel.app`

    if (navigator.share) {
      await navigator.share({ text })
    } else {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 hover:bg-slate-100 px-3 py-1.5 rounded-lg transition-colors"
      >
        📤 Chia sẻ kết quả
      </button>
    )
  }

  return (
    <div className="space-y-3">
      {/* Preview card */}
      <div
        ref={cardRef}
        className="rounded-2xl overflow-hidden border-2 select-none"
        style={{ borderColor: ptColor, background: 'linear-gradient(135deg, #0f172a 0%, #1e3a2f 100%)' }}
      >
        <div className="px-5 pt-4 pb-2 text-center">
          <p className="text-green-400 text-xs font-bold tracking-widest uppercase">World Cup 2026</p>
        </div>
        <div className="px-5 pb-4">
          {/* Score */}
          <div className="flex items-center justify-between gap-3 my-3">
            <div className="flex-1 text-right">
              <p className="text-white font-bold text-sm truncate">{homeTeam}</p>
            </div>
            <div className="bg-white/10 rounded-xl px-4 py-2 text-center flex-shrink-0">
              <p className="text-white text-2xl font-black tabular-nums">{homeScore}–{awayScore}</p>
              <p className="text-white/50 text-[10px]">KẾT QUẢ</p>
            </div>
            <div className="flex-1 text-left">
              <p className="text-white font-bold text-sm truncate">{awayTeam}</p>
            </div>
          </div>

          {/* Prediction */}
          <div className="bg-white/10 rounded-xl px-4 py-2.5 flex items-center justify-between">
            <div>
              <p className="text-white/60 text-[10px] uppercase font-semibold">Dự đoán của {userName}</p>
              <p className="text-white font-black text-lg tabular-nums">{predictedHome}–{predictedAway}</p>
            </div>
            <div className="text-right">
              <p style={{ color: ptColor }} className="font-black text-xl">
                {pointsEarned > 0 ? '+' : ''}{pointsEarned} pts
              </p>
              <p style={{ color: ptColor }} className="text-xs font-semibold">{ptLabel}</p>
            </div>
          </div>
        </div>

        <div className="px-5 py-2 bg-white/5 text-center">
          <p className="text-white/30 text-[10px]">worldcup-predict.vercel.app</p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={copyCard}
          className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold text-sm py-2.5 rounded-xl transition-colors"
        >
          {copied ? '✓ Đã sao chép' : '📤 Chia sẻ'}
        </button>
        <button
          onClick={() => setOpen(false)}
          className="px-4 py-2.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors text-sm"
        >
          Đóng
        </button>
      </div>
    </div>
  )
}

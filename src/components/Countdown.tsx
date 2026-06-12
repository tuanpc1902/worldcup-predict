'use client'
import { useEffect, useState } from 'react'
import { fmtDate } from '@/lib/time'

interface Props { matchTime: string; homeTeam: string; awayTeam: string }

export default function Countdown({ matchTime, homeTeam, awayTeam }: Props) {
  const [diff, setDiff] = useState(0)

  useEffect(() => {
    const target = new Date(matchTime).getTime()
    const tick = () => setDiff(Math.max(0, target - Date.now()))
    tick()
    const t = setInterval(tick, 1000)
    return () => clearInterval(t)
  }, [matchTime])

  if (diff <= 0) return null

  const totalSec = Math.floor(diff / 1000)
  const days = Math.floor(totalSec / 86400)
  const hours = Math.floor((totalSec % 86400) / 3600)
  const mins = Math.floor((totalSec % 3600) / 60)
  const secs = totalSec % 60

  const pad = (n: number) => String(n).padStart(2, '0')

  return (
    <div className="bg-gradient-to-br from-green-600 to-emerald-700 rounded-2xl p-5 text-white text-center">
      <p className="text-green-200 text-xs font-semibold uppercase tracking-widest mb-1">Trận tiếp theo</p>
      <p className="font-bold text-lg mb-3">
        {homeTeam} <span className="text-green-300">vs</span> {awayTeam}
      </p>
      <div className="flex items-center justify-center gap-3">
        {days > 0 && (
          <Unit value={days} label="ngày" />
        )}
        <Unit value={hours} label="giờ" />
        <Sep />
        <Unit value={mins} label="phút" />
        <Sep />
        <Unit value={secs} label="giây" pulse />
      </div>
      <p className="text-green-200 text-xs mt-3">{fmtDate(matchTime)}</p>
    </div>
  )
}

function Unit({ value, label, pulse }: { value: number; label: string; pulse?: boolean }) {
  return (
    <div className="flex flex-col items-center">
      <span className={`text-3xl font-black tabular-nums leading-none ${pulse ? 'animate-pulse' : ''}`}>
        {String(value).padStart(2, '0')}
      </span>
      <span className="text-green-300 text-[10px] mt-0.5">{label}</span>
    </div>
  )
}

function Sep() {
  return <span className="text-2xl font-black text-green-400 leading-none mb-3">:</span>
}

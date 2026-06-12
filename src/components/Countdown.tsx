'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth'
import { fmtDate } from '@/lib/time'
import FlagImg from './FlagImg'
import Link from 'next/link'

interface Props {
  matchId: string
  matchTime: string
  homeTeam: string
  awayTeam: string
  homeFlag?: string | null
  awayFlag?: string | null
}

export default function Countdown({ matchId, matchTime, homeTeam, awayTeam, homeFlag, awayFlag }: Props) {
  const [diff, setDiff] = useState(0)
  const [homeScore, setHomeScore] = useState(1)
  const [awayScore, setAwayScore] = useState(1)
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [existing, setExisting] = useState<{ h: number; a: number } | null>(null)
  const { user, init } = useAuthStore()
  const supabase = createClient()

  useEffect(() => { init() }, [init])

  useEffect(() => {
    const target = new Date(matchTime).getTime()
    const tick = () => setDiff(Math.max(0, target - Date.now()))
    tick()
    const t = setInterval(tick, 1000)
    return () => clearInterval(t)
  }, [matchTime])

  useEffect(() => {
    if (!user || !matchId) return
    supabase
      .from('predictions')
      .select('predicted_home, predicted_away')
      .eq('user_id', user.id)
      .eq('match_id', matchId)
      .maybeSingle()
      .then(({ data }: { data: { predicted_home: number; predicted_away: number } | null }) => {
        if (data) {
          setExisting({ h: data.predicted_home, a: data.predicted_away })
          setHomeScore(data.predicted_home)
          setAwayScore(data.predicted_away)
        }
      })
  }, [user, matchId])

  async function savePrediction() {
    if (!user) return
    setSaving(true)
    await supabase.from('predictions').upsert(
      { user_id: user.id, match_id: matchId, predicted_home: homeScore, predicted_away: awayScore },
      { onConflict: 'user_id,match_id' }
    )
    setExisting({ h: homeScore, a: awayScore })
    setSaved(true)
    setSaving(false)
    setTimeout(() => setSaved(false), 2500)
  }

  if (diff <= 0) return null

  const totalSec = Math.floor(diff / 1000)
  const days = Math.floor(totalSec / 86400)
  const hours = Math.floor((totalSec % 86400) / 3600)
  const mins = Math.floor((totalSec % 3600) / 60)
  const secs = totalSec % 60

  const isLocked = diff < 2 * 60 * 60 * 1000 // lock within 2h

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'linear-gradient(135deg, var(--brand) 0%, var(--brand-dark) 100%)' }}>
      {/* Header */}
      <div className="px-5 pt-4 pb-2 text-center">
        <p className="text-[11px] font-bold tracking-widest uppercase" style={{ color: 'rgba(255,255,255,0.6)' }}>
          Trận tiếp theo · {fmtDate(matchTime)}
        </p>
      </div>

      {/* Teams */}
      <div className="flex items-center justify-between px-6 pb-4 gap-3">
        <div className="flex-1 flex flex-col items-center gap-2">
          <FlagImg team={homeTeam} flag={homeFlag} size="lg" />
          <span className="text-white font-bold text-sm text-center leading-tight">{homeTeam}</span>
        </div>

        {/* Countdown digits */}
        <div className="flex flex-col items-center gap-2">
          <div className="flex items-end gap-1">
            {days > 0 && <><Unit value={days} label="ngày" /><Sep /></>}
            <Unit value={hours} label="giờ" />
            <Sep />
            <Unit value={mins} label="phút" />
            <Sep />
            <Unit value={secs} label="giây" pulse />
          </div>
        </div>

        <div className="flex-1 flex flex-col items-center gap-2">
          <FlagImg team={awayTeam} flag={awayFlag} size="lg" />
          <span className="text-white font-bold text-sm text-center leading-tight">{awayTeam}</span>
        </div>
      </div>

      {/* Predict row */}
      <div className="mx-4 mb-4 rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.1)' }}>
        {!user ? (
          <div className="text-center">
            <p className="text-white/70 text-xs mb-2">Đăng nhập để dự đoán trận này</p>
            <Link href="/login" className="inline-block text-xs font-bold px-4 py-1.5 rounded-lg text-white" style={{ background: 'var(--accent)' }}>
              Đăng nhập
            </Link>
          </div>
        ) : isLocked ? (
          <p className="text-center text-white/60 text-xs">Đã khóa dự đoán (dưới 2 giờ)</p>
        ) : (
          <div className="flex items-center gap-3">
            <span className="text-white/70 text-xs flex-shrink-0">Dự đoán</span>
            <div className="flex items-center gap-2 flex-1 justify-center">
              <ScoreInput value={homeScore} onChange={setHomeScore} />
              <span className="text-white/50 font-bold text-lg">–</span>
              <ScoreInput value={awayScore} onChange={setAwayScore} />
            </div>
            <button
              onClick={savePrediction}
              disabled={saving}
              className="flex-shrink-0 text-xs font-bold px-3 py-1.5 rounded-lg text-white transition-opacity disabled:opacity-50"
              style={{ background: saved ? '#16a34a' : 'var(--accent)' }}
            >
              {saved ? '✓ Lưu' : saving ? '...' : existing ? 'Cập nhật' : 'Lưu'}
            </button>
          </div>
        )}
        {existing && !saved && (
          <p className="text-center text-white/50 text-[10px] mt-1.5">
            Đã dự đoán: {existing.h}–{existing.a}
          </p>
        )}
      </div>
    </div>
  )
}

function ScoreInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => onChange(Math.max(0, value - 1))}
        className="w-7 h-7 rounded-lg text-white font-bold text-base flex items-center justify-center transition-opacity hover:opacity-80"
        style={{ background: 'rgba(255,255,255,0.15)' }}
      >−</button>
      <span className="text-white font-black text-xl tabular-nums w-6 text-center">{value}</span>
      <button
        onClick={() => onChange(Math.min(20, value + 1))}
        className="w-7 h-7 rounded-lg text-white font-bold text-base flex items-center justify-center transition-opacity hover:opacity-80"
        style={{ background: 'rgba(255,255,255,0.15)' }}
      >+</button>
    </div>
  )
}

function Unit({ value, label, pulse }: { value: number; label: string; pulse?: boolean }) {
  return (
    <div className="flex flex-col items-center">
      <span className={`text-2xl font-black tabular-nums leading-none text-white ${pulse ? 'animate-pulse' : ''}`}>
        {String(value).padStart(2, '0')}
      </span>
      <span className="text-[9px] mt-0.5" style={{ color: 'rgba(255,255,255,0.5)' }}>{label}</span>
    </div>
  )
}

function Sep() {
  return <span className="text-xl font-black mb-3" style={{ color: 'rgba(255,255,255,0.4)' }}>:</span>
}

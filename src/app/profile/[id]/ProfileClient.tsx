'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import FlagImg from '@/components/FlagImg'
import AchievementBadges from '@/components/AchievementBadges'
import TierBadge from '@/components/TierBadge'
import { getTier, getNextTier } from '@/lib/tier'
import { fmtDate, fmtTime } from '@/lib/time'
import LazyList from '@/components/LazyList'
import { useAuthStore } from '@/store/auth'
import type { Profile, PredictionWithMatch } from '@/types'

const STAGE_LABELS: Record<string, string> = {
  group: 'Vòng bảng', round_of_32: 'Vòng 1/16', round_of_16: 'Vòng 1/8',
  quarter: 'Tứ kết', semi: 'Bán kết', final: 'Chung kết',
}

function ptsColor(pts: number | null): string {
  if (pts === null) return 'bg-slate-100 text-slate-500'
  if (pts > 0) return 'bg-green-100 text-green-700'
  if (pts < 0) return 'bg-red-100 text-red-600'
  return 'bg-slate-100 text-slate-500'
}

interface Props {
  profile: Profile
  predictions: PredictionWithMatch[]
  rank: number | null
}

export default function ProfileClient({ profile, predictions, rank }: Props) {
  const router = useRouter()
  const { user } = useAuthStore()

  // Trigger achievement check when viewing own profile
  useEffect(() => {
    if (user?.id === profile.id) {
      fetch('/api/achievements', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: profile.id }) })
    }
  }, [user, profile.id])

  const finished = predictions.filter(p => p.points_earned !== null)
  const exact = finished.filter(p => (p.points_earned ?? 0) >= 5).length
  const correct = finished.filter(p => { const e = p.points_earned ?? 0; return e > 0 && e < 5 }).length
  const wrong = finished.filter(p => (p.points_earned ?? 0) < 0).length
  const accuracy = finished.length > 0 ? Math.round(((exact + correct) / finished.length) * 100) : 0
  const tier = getTier(profile.total_points)
  const nextTier = getNextTier(profile.total_points)

  return (
    <div className="max-w-2xl mx-auto space-y-5 fade-in pb-20">
      <button onClick={() => router.back()} className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 pt-2">
        Quay lại
      </button>

      {/* Profile card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center text-2xl font-black text-green-700 flex-shrink-0">
            {profile.display_name[0]?.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-slate-800 truncate">{profile.display_name}</h1>
              <TierBadge points={profile.total_points} showName size="md" />
            </div>
            {rank && <p className="text-slate-500 text-sm mt-0.5">Hạng #{rank} · Tham gia {fmtDate(profile.created_at)}</p>}
            {nextTier && (
              <div className="mt-2">
                <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                  <span>{tier.icon} {tier.name}</span>
                  <span>còn {nextTier.remaining} pts → {nextTier.tier.icon} {nextTier.tier.name}</span>
                </div>
                <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${Math.round(((profile.total_points - tier.min) / (nextTier.tier.min - tier.min)) * 100)}%`,
                      background: nextTier.tier.color,
                    }}
                  />
                </div>
              </div>
            )}
          </div>
          <div className="text-right flex-shrink-0">
            <div className={`text-3xl font-black ${profile.total_points < 0 ? 'text-red-500' : profile.total_points > 0 ? 'text-green-600' : 'text-slate-400'}`}>
              {profile.total_points}
            </div>
            <div className="text-xs text-slate-400">điểm</div>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-4 gap-3 mt-5 pt-5 border-t border-slate-100">
          {[
            { label: 'Đã dự đoán', value: predictions.length, color: 'text-slate-700' },
            { label: 'Đúng tỉ số', value: exact, color: 'text-green-600' },
            { label: 'Đúng KQ', value: correct, color: 'text-blue-600' },
            { label: 'Tỉ lệ đúng', value: `${accuracy}%`, color: 'text-amber-600' },
          ].map(s => (
            <div key={s.label} className="text-center">
              <div className={`text-xl font-black ${s.color}`}>{s.value}</div>
              <div className="text-xs text-slate-400 mt-0.5 leading-tight">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Accuracy bar */}
        {finished.length > 0 && (
          <div className="mt-4">
            <div className="flex h-2 rounded-full overflow-hidden gap-0.5">
              <div className="bg-green-400 transition-all" style={{ width: `${(exact / finished.length) * 100}%` }} />
              <div className="bg-blue-400 transition-all" style={{ width: `${(correct / finished.length) * 100}%` }} />
              <div className="bg-red-300 transition-all" style={{ width: `${(wrong / finished.length) * 100}%` }} />
            </div>
            <div className="flex justify-between text-[10px] text-slate-400 mt-1">
              <span className="text-green-600">Đúng tỉ số {exact}</span>
              <span className="text-blue-500">Đúng KQ {correct}</span>
              <span className="text-red-400">Sai {wrong}</span>
            </div>
          </div>
        )}
      </div>

      {/* Achievements */}
      <AchievementBadges userId={profile.id} />

      {/* Head to head link */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center justify-between">
        <div>
          <p className="font-semibold text-slate-700 text-sm">So sánh với người khác</p>
          <p className="text-xs text-slate-400 mt-0.5">Xem ai đoán chuẩn hơn theo từng trận</p>
        </div>
        <Link href={`/h2h?a=${profile.id}`} className="text-sm font-semibold text-green-600 hover:underline">
          Head-to-head
        </Link>
      </div>

      {/* Prediction history */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100">
          <h2 className="font-bold text-sm text-slate-700">Lịch sử dự đoán · {predictions.length}</h2>
        </div>

        {predictions.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-sm">Chưa có dự đoán nào</div>
        ) : (
          <div className="divide-y divide-slate-50">
            <LazyList
              items={predictions}
              pageSize={15}
              renderItem={(p) => {
                const m = p.matches
                if (!m) return null
                const isFinished = m.status === 'finished'
                return (
                  <Link key={p.id} href={`/matches/${p.match_id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-1.5 flex-1 min-w-0">
                      <FlagImg team={m.home_team} flag={m.home_flag} size="xs" />
                      <span className="text-xs font-medium text-slate-700 truncate">{m.home_team}</span>
                    </div>

                    <div className="text-center flex-shrink-0 space-y-0.5">
                      {isFinished ? (
                        <div className="text-xs font-black text-slate-700 tabular-nums">
                          {m.home_score}–{m.away_score}
                        </div>
                      ) : (
                        <div className="text-[10px] text-slate-400">{fmtTime(m.match_time)}</div>
                      )}
                      <div className="text-[10px] text-slate-400">
                        {p.predicted_home}–{p.predicted_away}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 flex-1 min-w-0 justify-end">
                      <span className="text-xs font-medium text-slate-700 truncate text-right">{m.away_team}</span>
                      <FlagImg team={m.away_team} flag={m.away_flag} size="xs" />
                    </div>

                    <div className="flex-shrink-0 w-16 text-right">
                      {p.points_earned !== null ? (
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${ptsColor(p.points_earned)}`}>
                          {p.points_earned > 0 ? '+' : ''}{p.points_earned}
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400">chờ KQ</span>
                      )}
                    </div>
                  </Link>
                )
              }}
            />
          </div>
        )}
      </div>
    </div>
  )
}

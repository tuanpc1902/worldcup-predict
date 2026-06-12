import { format } from 'date-fns'
import { vi } from 'date-fns/locale'
import type { Match, Prediction } from '@/types'

interface Props {
  match: Match
  prediction?: Prediction | null
  showResult?: boolean
}

const STAGE_LABELS: Record<string, string> = {
  group: 'Vòng bảng',
  round_of_32: 'Vòng 1/16',
  round_of_16: 'Vòng 1/8',
  quarter: 'Tứ kết',
  semi: 'Bán kết',
  final: 'Chung kết',
}

export default function MatchCard({ match, prediction, showResult }: Props) {
  const isFinished = match.status === 'finished'
  const isLive = match.status === 'live'

  const pointsBg =
    prediction?.points_earned === 5 ? 'bg-green-100 text-green-700' :
    prediction?.points_earned === 3 ? 'bg-blue-100 text-blue-700' :
    prediction?.points_earned === -1 ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-500'

  return (
    <div className="bg-white rounded-xl p-4 border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full font-medium">
          {STAGE_LABELS[match.stage] ?? match.stage}
          {match.group_name && ` · ${match.group_name}`}
        </span>
        <div className="flex items-center gap-2">
          {isLive && (
            <span className="flex items-center gap-1 text-xs text-red-500 font-semibold">
              <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
              LIVE
            </span>
          )}
          {match.is_locked && !isLive && !isFinished && (
            <span className="text-xs text-slate-400">🔒 Đã khóa</span>
          )}
          {match.venue && (
            <span className="text-xs text-slate-400 hidden sm:block">{match.venue}</span>
          )}
        </div>
      </div>

      {/* Teams & Score */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 text-right">
          {match.home_flag && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={match.home_flag} alt="" className="w-8 h-8 object-contain ml-auto mb-1" />
          )}
          <p className="font-semibold text-slate-800 text-sm leading-tight">{match.home_team}</p>
        </div>

        <div className="text-center min-w-[90px]">
          {isFinished || isLive ? (
            <div className={`text-2xl font-bold tabular-nums px-3 py-1 rounded-lg ${
              isFinished ? 'bg-slate-100 text-slate-800' : 'bg-red-50 text-red-600'
            }`}>
              {match.home_score ?? 0} – {match.away_score ?? 0}
            </div>
          ) : (
            <div className="bg-slate-50 rounded-lg px-3 py-2">
              <div className="font-bold text-slate-800 text-base">
                {format(new Date(match.match_time), 'HH:mm', { locale: vi })}
              </div>
              <div className="text-xs text-slate-400">
                {format(new Date(match.match_time), 'dd/MM', { locale: vi })}
              </div>
            </div>
          )}
        </div>

        <div className="flex-1 text-left">
          {match.away_flag && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={match.away_flag} alt="" className="w-8 h-8 object-contain mb-1" />
          )}
          <p className="font-semibold text-slate-800 text-sm leading-tight">{match.away_team}</p>
        </div>
      </div>

      {/* Prediction row */}
      {prediction && (
        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-sm">
          <span className="text-slate-500">
            Dự đoán: <span className="text-slate-800 font-semibold">
              {prediction.predicted_home} – {prediction.predicted_away}
            </span>
          </span>
          {prediction.points_earned !== null ? (
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${pointsBg}`}>
              {prediction.points_earned > 0 ? '+' : ''}{prediction.points_earned} pts
            </span>
          ) : (
            <span className="text-xs text-slate-400 bg-slate-50 px-2.5 py-1 rounded-full">Chờ kết quả</span>
          )}
        </div>
      )}
    </div>
  )
}

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
  const isLocked = match.is_locked

  const pointsColor =
    prediction?.points_earned === 5 ? 'text-green-400' :
    prediction?.points_earned === 3 ? 'text-blue-400' :
    prediction?.points_earned === -1 ? 'text-red-400' : 'text-gray-400'

  return (
    <div className="bg-gray-800 rounded-xl p-4 border border-gray-700 hover:border-gray-600 transition-colors">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-gray-400 bg-gray-700 px-2 py-0.5 rounded-full">
          {STAGE_LABELS[match.stage] ?? match.stage}
          {match.group_name && ` · ${match.group_name}`}
        </span>
        <div className="flex items-center gap-2">
          {isLive && (
            <span className="flex items-center gap-1 text-xs text-red-400 font-semibold">
              <span className="w-1.5 h-1.5 bg-red-400 rounded-full animate-pulse" />
              LIVE
            </span>
          )}
          {isLocked && !isLive && !isFinished && (
            <span className="text-xs text-gray-500">🔒 Đã khóa</span>
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
          <p className="font-semibold text-white text-sm leading-tight">{match.home_team}</p>
        </div>

        <div className="text-center min-w-[80px]">
          {isFinished || isLive ? (
            <div className="text-2xl font-bold text-white tabular-nums">
              {match.home_score ?? 0} – {match.away_score ?? 0}
            </div>
          ) : (
            <div className="text-sm text-gray-400">
              <div className="font-medium text-white">
                {format(new Date(match.match_time), 'HH:mm', { locale: vi })}
              </div>
              <div className="text-xs">
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
          <p className="font-semibold text-white text-sm leading-tight">{match.away_team}</p>
        </div>
      </div>

      {/* Prediction row */}
      {prediction && (
        <div className="mt-3 pt-3 border-t border-gray-700 flex items-center justify-between text-sm">
          <span className="text-gray-400">
            Dự đoán: <span className="text-white font-medium">
              {prediction.predicted_home} – {prediction.predicted_away}
            </span>
          </span>
          {prediction.points_earned !== null ? (
            <span className={`font-bold ${pointsColor}`}>
              {prediction.points_earned > 0 ? '+' : ''}{prediction.points_earned} pts
            </span>
          ) : (
            <span className="text-gray-500 text-xs">Chờ kết quả</span>
          )}
        </div>
      )}
    </div>
  )
}

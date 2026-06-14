'use client'
import Link from 'next/link'
import { useEffect } from 'react'
import { fmtTime, fmtDate, fmtMatchTimes, teamHref } from '@/lib/time'
import FlagImg from '@/components/FlagImg'
import { useConfigStore } from '@/store/config'
import type { Match, Prediction } from '@/types'


interface Props {
  match: Match
  prediction?: Prediction | null
  showResult?: boolean
  showPredictLink?: boolean
}

const STAGE_LABELS: Record<string, string> = {
  group: 'Vòng bảng',
  round_of_32: 'Vòng 1/16',
  round_of_16: 'Vòng 1/8',
  quarter: 'Tứ kết',
  semi: 'Bán kết',
  final: 'Chung kết',
}

export default function MatchCard({ match, prediction, showResult, showPredictLink }: Props) {
  const isFinished = match.status === 'finished'
  const isLive = match.status === 'live'
  const times = (!isFinished && !isLive) ? fmtMatchTimes(match.match_time) : null
  const { config, load: loadConfig } = useConfigStore()
  useEffect(() => { loadConfig() }, [loadConfig])
  const showScores = config.show_scores

  const pts = prediction?.points_earned ?? null
  const pointsBg =
    pts !== null && pts > 0  ? 'bg-green-100 text-green-700' :
    pts !== null && pts < 0  ? 'bg-red-100 text-red-600' :
    pts === 0                ? 'bg-slate-100 text-slate-500' :
    'bg-slate-100 text-slate-500'

  return (
    <div className="bg-white rounded-xl p-4 border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all relative">
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
            <span className="text-xs text-slate-400">🔒</span>
          )}
          {match.venue && (
            <span className="text-xs text-slate-400 hidden sm:block truncate max-w-[120px]">{match.venue}</span>
          )}
        </div>
      </div>

      {/* Teams & Score */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex-1 min-w-0 text-center flex flex-col items-center gap-2">
          <FlagImg team={match.home_team} flag={match.home_flag} size="xl" href={teamHref(match.home_team)} />
          <div className="h-9 w-full flex items-center justify-center px-1 overflow-hidden">
            <Link href={teamHref(match.home_team)} onClick={e => e.stopPropagation()} className="font-semibold text-slate-800 text-sm leading-tight line-clamp-2 text-center break-words w-full hover:text-green-600 transition-colors">{match.home_team}</Link>
          </div>
        </div>

        <div className="text-center flex-shrink-0 w-[100px]">
          {isFinished || isLive ? (
            <div className={`text-xl font-bold tabular-nums px-2 py-1 rounded-lg ${
              isFinished ? 'bg-slate-100 text-slate-800' : 'bg-red-50 text-red-600'
            }`}>
              {showScores ? `${match.home_score ?? 0} – ${match.away_score ?? 0}` : '? – ?'}
            </div>
          ) : times ? (
            <div className="bg-slate-50 rounded-lg px-2 py-2 w-full text-center">
              <div className="text-[10px] text-slate-400 font-medium mb-0.5">🇻🇳 GMT+7</div>
              <div className="font-bold text-slate-800 text-base tabular-nums leading-none">{times.vnTime}</div>
              <div className="text-[10px] text-slate-400 mt-0.5">{times.vnDate}</div>
              <div className="border-t border-slate-200 mt-1.5 pt-1">
                <span className="text-[10px] text-slate-400">{times.utcTime} UTC</span>
              </div>
            </div>
          ) : null}
        </div>

        <div className="flex-1 min-w-0 text-center flex flex-col gap-2 items-center">
          <FlagImg team={match.away_team} flag={match.away_flag} size="xl" href={teamHref(match.away_team)} />
          <div className="h-9 w-full flex items-center justify-center px-1 overflow-hidden">
            <Link href={teamHref(match.away_team)} onClick={e => e.stopPropagation()} className="font-semibold text-slate-800 text-sm leading-tight line-clamp-2 text-center break-words w-full hover:text-green-600 transition-colors">{match.away_team}</Link>
          </div>
        </div>
      </div>

      {/* Prediction row */}
      {prediction && (
        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-sm">
          <span className="text-slate-500">
            Dự đoán: <span className="text-slate-800 font-semibold">
              {prediction.predicted_home}–{prediction.predicted_away}
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

      {/* Predict CTA — shown on homepage upcoming matches */}
      {showPredictLink && !isFinished && !isLive && (
        <div className="mt-3 pt-3 border-t border-slate-100">
          <Link
            href={`/matches/${match.id}`}
            className="block w-full text-center text-sm font-semibold text-green-600 hover:text-green-700 hover:bg-green-50 py-1.5 rounded-lg transition-colors uppercase"
          >
            Dự đoán ngay
          </Link>
        </div>
      )}

      {/* Click anywhere on finished/live card to view detail */}
      {(isFinished || isLive) && (
        <Link href={`/matches/${match.id}`} className="absolute inset-0 rounded-xl" aria-label="Xem chi tiết" />
      )}
    </div>
  )
}

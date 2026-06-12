import { createServerSupabase } from '@/lib/supabase-server'
import { fmtTime, fmtDate } from '@/lib/time'
import type { Match } from '@/types'
import { getFlagUrl } from '@/lib/flag-map'
import { isPlaceholder } from '@/lib/team-utils'

export const dynamic = 'force-dynamic'

const ROUND_ORDER = ['round_of_32', 'round_of_16', 'quarter', 'semi', 'final'] as const
const ROUND_LABELS: Record<string, string> = {
  round_of_32: 'Vòng 1/16',
  round_of_16: 'Vòng 1/8',
  quarter: 'Tứ kết',
  semi: 'Bán kết',
  final: 'Chung kết',
}

// Fixed card dimensions for connector calculation
const CARD_H = 78   // px — height of one MatchSlot
const PAIR_GAP = 28 // px — gap between two cards in the same pair
const COL_GAP = 48  // px — gap between round columns (also SVG connector width)

function TeamSlot({ name, score, isWinner }: { name: string; score: number | null; isWinner?: boolean }) {
  const tbd = !name || isPlaceholder(name)
  const flag = !tbd ? getFlagUrl(name, 40) : null
  const displayName = tbd ? 'TBD' : name
  return (
    <div className={`flex items-center gap-2 px-3 py-2.5 ${isWinner ? 'bg-green-50' : 'bg-white'}`}>
      {flag
        ? <img src={flag} alt={name} className="w-6 h-4 object-cover rounded shadow-sm flex-shrink-0" />
        : <div className="w-6 h-4 bg-slate-100 rounded flex-shrink-0" />
      }
      <span className={`text-sm flex-1 truncate ${
        isWinner ? 'font-bold text-green-700' :
        tbd ? 'text-slate-300 italic' : 'text-slate-700'
      }`}>
        {displayName}
      </span>
      {score !== null && (
        <span className={`text-sm font-bold tabular-nums ml-1 ${isWinner ? 'text-green-700' : 'text-slate-500'}`}>
          {score}
        </span>
      )}
    </div>
  )
}

function MatchSlot({ match }: { match?: Match }) {
  if (!match) return (
    <div className="border border-dashed border-slate-200 rounded-lg overflow-hidden w-52 bg-slate-50 opacity-40" style={{ height: CARD_H }}>
      <div className="flex items-center gap-2 px-3 py-2.5">
        <div className="w-6 h-4 bg-slate-100 rounded" />
        <span className="text-sm text-slate-300 italic">TBD</span>
      </div>
      <div className="h-px bg-slate-100" />
      <div className="flex items-center gap-2 px-3 py-2.5">
        <div className="w-6 h-4 bg-slate-100 rounded" />
        <span className="text-sm text-slate-300 italic">TBD</span>
      </div>
    </div>
  )

  const homeWin = match.status === 'finished' && match.home_score! > match.away_score!
  const awayWin = match.status === 'finished' && match.away_score! > match.home_score!

  return (
    <div className={`border rounded-lg overflow-hidden w-52 shadow-sm ${
      match.status === 'live' ? 'border-red-400 ring-1 ring-red-300' : 'border-slate-200'
    }`}>
      {match.status === 'live' && (
        <div className="bg-red-500 text-white text-xs text-center py-0.5 font-semibold flex items-center justify-center gap-1">
          <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" /> LIVE
        </div>
      )}
      {match.status === 'scheduled' && (
        <div className="bg-slate-50 border-b border-slate-100 text-xs text-center py-0.5 text-slate-400">
          {fmtTime(match.match_time)} · {fmtDate(match.match_time)}
        </div>
      )}
      <TeamSlot name={match.home_team} score={match.home_score} isWinner={homeWin} />
      <div className="h-px bg-slate-100" />
      <TeamSlot name={match.away_team} score={match.away_score} isWinner={awayWin} />
    </div>
  )
}

// SVG connector: links a pair (top+bottom) to the single next-round match
// The pair's total rendered height = CARD_H + PAIR_GAP + CARD_H
function PairConnector({ extraTopOffset = 0 }: { extraTopOffset?: number }) {
  const pairH = CARD_H * 2 + PAIR_GAP
  const topMid = CARD_H / 2 + extraTopOffset      // center of top card
  const botMid = CARD_H + PAIR_GAP + CARD_H / 2 + extraTopOffset  // center of bottom card
  const midY = (topMid + botMid) / 2              // midpoint between the two centers

  return (
    <svg
      width={COL_GAP}
      height={pairH + extraTopOffset * 2}
      className="flex-shrink-0 overflow-visible"
      style={{ marginTop: -(extraTopOffset) }}
    >
      {/* horizontal from top card right edge → to vertical bar */}
      <line x1="0" y1={topMid} x2={COL_GAP * 0.6} y2={topMid} stroke="#cbd5e1" strokeWidth="1.5" />
      {/* vertical bar connecting top and bottom */}
      <line x1={COL_GAP * 0.6} y1={topMid} x2={COL_GAP * 0.6} y2={botMid} stroke="#cbd5e1" strokeWidth="1.5" />
      {/* horizontal from bottom card right edge → to vertical bar */}
      <line x1="0" y1={botMid} x2={COL_GAP * 0.6} y2={botMid} stroke="#cbd5e1" strokeWidth="1.5" />
      {/* outgoing horizontal from midpoint → to next column */}
      <line x1={COL_GAP * 0.6} y1={midY} x2={COL_GAP} y2={midY} stroke="#cbd5e1" strokeWidth="1.5" />
    </svg>
  )
}

// Simple horizontal connector for unpaired matches (semi → final)
function SingleConnector() {
  return (
    <svg width={COL_GAP} height={CARD_H} className="flex-shrink-0">
      <line x1="0" y1={CARD_H / 2} x2={COL_GAP} y2={CARD_H / 2} stroke="#cbd5e1" strokeWidth="1.5" />
    </svg>
  )
}

export default async function BracketPage() {
  const supabase = await createServerSupabase()
  const { data } = await supabase
    .from('matches')
    .select('*')
    .in('stage', [...ROUND_ORDER])
    .order('match_time', { ascending: true })

  const matches = (data ?? []) as Match[]
  const byRound: Record<string, Match[]> = {}
  ROUND_ORDER.forEach(r => { byRound[r] = matches.filter(m => m.stage === r) })

  const hasKnockout = matches.length > 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">🏟️ Bracket thi đấu</h1>
        <p className="text-slate-500 text-sm mt-1">Lịch thi đấu vòng loại trực tiếp</p>
      </div>

      {!hasKnockout ? (
        <div className="text-center bg-white rounded-2xl border border-slate-200 py-20">
          <p className="text-4xl mb-3">🏟️</p>
          <p className="text-slate-600 font-medium">Chưa có vòng loại trực tiếp</p>
          <p className="text-slate-400 text-sm mt-1">Bracket sẽ hiển thị sau khi vòng bảng kết thúc (11/7)</p>
        </div>
      ) : (
        <div className="overflow-x-auto pb-6">
          <div className="flex items-start min-w-max pt-2">
            {ROUND_ORDER.filter(r => byRound[r].length > 0).map((round, roundIdx, activeRounds) => {
              const roundMatches = byRound[round]
              const isLastRound = roundIdx === activeRounds.length - 1
              const hasNextRound = !isLastRound

              // Group matches into pairs for connector rendering
              const pairs: [Match | undefined, Match | undefined][] = []
              for (let i = 0; i < roundMatches.length; i += 2) {
                pairs.push([roundMatches[i], roundMatches[i + 1]])
              }
              const isSingleMatch = roundMatches.length === 1

              return (
                <div key={round} className="flex items-start">
                  {/* Column */}
                  <div className="flex flex-col">
                    {/* Round label */}
                    <div className="text-center mb-3 w-52">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider bg-slate-100 px-3 py-1 rounded-full">
                        {ROUND_LABELS[round]}
                      </span>
                      <div className="text-xs text-slate-400 mt-1">{roundMatches.length} trận</div>
                    </div>

                    {/* Matches */}
                    <div className="flex flex-col" style={{ gap: PAIR_GAP }}>
                      {isSingleMatch ? (
                        <MatchSlot match={roundMatches[0]} />
                      ) : (
                        pairs.map(([top, bottom], pi) => (
                          <div key={pi} className="flex flex-col" style={{ gap: PAIR_GAP }}>
                            <MatchSlot match={top} />
                            <MatchSlot match={bottom} />
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Connectors to next round */}
                  {hasNextRound && (
                    <div className="flex flex-col mt-[44px]"> {/* 44px = label row height */}
                      {isSingleMatch ? (
                        <SingleConnector />
                      ) : (
                        pairs.map((_, pi) => (
                          <div key={pi} style={{ marginBottom: pi < pairs.length - 1 ? PAIR_GAP * 2 + CARD_H : 0 }}>
                            <PairConnector />
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )
            })}

            {/* Champion display */}
            {byRound['final']?.some(m => m.status === 'finished') && (() => {
              const final = byRound['final'][0]
              const champion = final.home_score! > final.away_score! ? final.home_team : final.away_team
              const flag = getFlagUrl(champion)
              return (
                <div className="flex flex-col items-center justify-start gap-2 mt-[44px] px-4">
                  <div className="h-[78px] flex items-center">
                    <div className="bg-amber-50 border-2 border-amber-400 rounded-xl p-4 flex flex-col items-center gap-2 w-44">
                      {flag && <img src={flag} alt={champion} className="w-14 h-10 object-cover rounded shadow" />}
                      <span className="font-bold text-amber-800 text-center text-sm">{champion}</span>
                      <span className="text-xl">🏆</span>
                    </div>
                  </div>
                </div>
              )
            })()}
          </div>
        </div>
      )}
    </div>
  )
}

'use client'
import React, { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import FlagImg from '@/components/FlagImg'
import { fmtMatchTimes, fmtDate, teamHref, teamSlug } from '@/lib/time'
import { useConfigStore } from '@/store/config'
import type { Match, MatchGoal } from '@/types'

const STAGE_LABELS: Record<string, string> = {
  group: 'Vòng bảng', round_of_32: 'Vòng 1/16', round_of_16: 'Vòng 1/8',
  quarter: 'Tứ kết', semi: 'Bán kết', final: 'Chung kết',
}

interface PlayerStat {
  player_name: string
  goals: number          // real goals (excl. OG)
  penalties: number
  own_goals: number
  goalsByMatch: Record<string, number>  // matchId → count (for hat-trick)
  events: { minute: number | null; is_penalty: boolean; is_own_goal: boolean; match_id: string }[]
}

export default function TeamPage() {
  const params = useParams()
  const slug = decodeURIComponent(params.name as string)
  const supabase = createClient()

  const [matches, setMatches] = useState<Match[]>([])
  const [teamName, setTeamName] = useState('')
  const { config, load: loadConfig } = useConfigStore()
  useEffect(() => { loadConfig() }, [loadConfig])
  const showGoals = config.show_goals
  const [goals, setGoals] = useState<MatchGoal[]>([])
  const [teamFlag, setTeamFlag] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: allMatches } = await supabase.from('matches').select('*').order('match_time')
      const allM = (allMatches ?? []) as Match[]

      // Resolve canonical team name from slug
      const allTeams = new Set<string>()
      allM.forEach(m => { allTeams.add(m.home_team); allTeams.add(m.away_team) })
      const canonical = [...allTeams].find(t => teamSlug(t) === slug) ?? slug.replace(/-/g, ' ')
      setTeamName(canonical)

      const teamMatches = allM.filter(m => m.home_team === canonical || m.away_team === canonical)
      setMatches(teamMatches)

      const flag = teamMatches.find(m => m.home_team === canonical)?.home_flag
        ?? teamMatches.find(m => m.away_team === canonical)?.away_flag ?? null
      setTeamFlag(flag)

      if (teamMatches.length > 0) {
        const { data: goalData } = await supabase
          .from('match_goals')
          .select('*')
          .in('match_id', teamMatches.map(m => m.id))
          .order('minute')
        setGoals((goalData ?? []) as MatchGoal[])
      }
      setLoading(false)
    }
    load()
  }, [slug])

  // ── Derived stats ──────────────────────────────────────────────────────────

  const goalsByMatch = goals.reduce<Record<string, MatchGoal[]>>((acc, g) => {
    if (!acc[g.match_id]) acc[g.match_id] = []
    acc[g.match_id].push(g)
    return acc
  }, {})

  // Player stats (only goals FOR this team, OG tracked separately)
  const playerMap: Record<string, PlayerStat> = {}
  for (const g of goals) {
    const scorer = g.player_name
    if (!playerMap[scorer]) {
      playerMap[scorer] = { player_name: scorer, goals: 0, penalties: 0, own_goals: 0, goalsByMatch: {}, events: [] }
    }
    playerMap[scorer].events.push({ minute: g.minute, is_penalty: g.is_penalty, is_own_goal: g.is_own_goal, match_id: g.match_id })
    if (g.is_own_goal) {
      playerMap[scorer].own_goals++
    } else if (g.team_name === teamName) {
      playerMap[scorer].goals++
      if (g.is_penalty) playerMap[scorer].penalties++
      playerMap[scorer].goalsByMatch[g.match_id] = (playerMap[scorer].goalsByMatch[g.match_id] ?? 0) + 1
    }
  }
  const playerStats = Object.values(playerMap)
    .filter(p => p.goals > 0 || p.own_goals > 0)
    .sort((a, b) => b.goals - a.goals || a.player_name.localeCompare(b.player_name))

  // Hat-trick: player scored 3+ in a single match
  const hatTrickPlayers = new Set(
    playerStats.filter(p => Object.values(p.goalsByMatch).some(n => n >= 3)).map(p => p.player_name)
  )
  // Perfect hat-trick (3 different types — just treat as 4+ goals per match for now)
  const fourPlusPlayers = new Set(
    playerStats.filter(p => Object.values(p.goalsByMatch).some(n => n >= 4)).map(p => p.player_name)
  )

  // OG against this team
  const ownGoalsAgainst = goals.filter(g => g.is_own_goal && g.team_name !== teamName)

  const finished = matches.filter(m => m.status === 'finished')
  const live     = matches.filter(m => m.status === 'live')
  const upcoming = matches.filter(m => m.status === 'scheduled')

  const totalGoalsFor     = goals.filter(g => g.team_name === teamName && !g.is_own_goal).length
                          + ownGoalsAgainst.length
  const totalGoalsAgainst = goals.filter(g => g.team_name !== teamName && !g.is_own_goal).length
                          + goals.filter(g => g.team_name === teamName && g.is_own_goal).length

  const wins   = finished.filter(m => { const h = m.home_team === teamName; return h ? (m.home_score??0) > (m.away_score??0) : (m.away_score??0) > (m.home_score??0) }).length
  const draws  = finished.filter(m => m.home_score === m.away_score).length
  const losses = finished.length - wins - draws

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading) return (
    <div className="space-y-4 animate-pulse">
      <div className="h-36 bg-white rounded-2xl border border-slate-200" />
      {[...Array(4)].map((_, i) => <div key={i} className="h-16 bg-white rounded-xl border border-slate-200" />)}
    </div>
  )

  if (matches.length === 0) return (
    <div className="text-center py-20 bg-white rounded-2xl border border-slate-200">
      <p className="text-4xl mb-3">🔍</p>
      <p className="text-slate-600 font-medium">Không tìm thấy đội "{teamName}"</p>
      <Link href="/" className="mt-4 inline-block text-sm text-green-600 hover:underline">← Về trang chủ</Link>
    </div>
  )

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <div className="flex items-center gap-4 mb-5">
          <FlagImg team={teamName} flag={teamFlag} size="lg" />
          <div>
            <h1 className="text-2xl font-bold text-slate-800">{teamName}</h1>
            <p className="text-slate-400 text-sm mt-0.5">{matches.length} trận · World Cup 2026</p>
          </div>
        </div>
        <div className="grid grid-cols-5 gap-2 text-center">
          {[
            { label: 'Thắng',     value: wins,              color: 'text-green-600', bg: 'bg-green-50' },
            { label: 'Hòa',       value: draws,             color: 'text-amber-500', bg: 'bg-amber-50' },
            { label: 'Thua',      value: losses,            color: 'text-red-500',   bg: 'bg-red-50' },
            { label: 'Bàn vào',   value: totalGoalsFor,     color: 'text-blue-600',  bg: 'bg-blue-50' },
            { label: 'Bàn thủng', value: totalGoalsAgainst, color: 'text-slate-600', bg: 'bg-slate-100' },
          ].map(s => (
            <div key={s.label} className={`${s.bg} rounded-xl py-3`}>
              <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-[11px] text-slate-400 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Live ── */}
      {live.length > 0 && (
        <MatchSection title="Đang thi đấu" accent="text-red-500">
          {live.map(m => <MatchRow key={m.id} match={m} teamName={teamName} goals={goalsByMatch[m.id] ?? []} showGoals={showGoals} />)}
        </MatchSection>
      )}

      {/* ── Upcoming ── */}
      {upcoming.length > 0 && (
        <MatchSection title="Sắp thi đấu">
          {upcoming.map(m => <MatchRow key={m.id} match={m} teamName={teamName} goals={[]} showGoals={showGoals} />)}
        </MatchSection>
      )}

      {/* ── Finished ── */}
      {finished.length > 0 && (
        <MatchSection title="Đã thi đấu">
          {finished.map(m => <MatchRow key={m.id} match={m} teamName={teamName} goals={goalsByMatch[m.id] ?? []} showGoals={showGoals} />)}
        </MatchSection>
      )}

      {/* ── Player scorer stats ── */}
      {showGoals && playerStats.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-bold text-slate-800">Thống kê cầu thủ</h2>
            <span className="text-xs text-slate-400">{playerStats.filter(p => p.goals > 0).length} cầu thủ ghi bàn</span>
          </div>
          <div className="divide-y divide-slate-50">
            {playerStats.map((p, i) => {
              const isHT  = hatTrickPlayers.has(p.player_name)
              const is4   = fourPlusPlayers.has(p.player_name)
              const matchGoalCounts = Object.values(p.goalsByMatch).sort((a, b) => b - a)
              return (
                <div key={p.player_name} className="px-5 py-4 hover:bg-slate-50">
                  <div className="flex items-start gap-3">
                    {/* Rank + goals */}
                    <div className="flex flex-col items-center w-10 shrink-0 pt-0.5">
                      <span className="text-xs text-slate-400 font-medium">{i + 1}</span>
                      <span className="text-2xl font-black text-green-600 leading-tight">{p.goals}</span>
                      <span className="text-[10px] text-slate-400">bàn</span>
                    </div>

                    {/* Player info + events */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center flex-wrap gap-1.5 mb-2">
                        <span className="font-semibold text-slate-800">{p.player_name}</span>
                        {/* Badges */}
                        {is4 && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700 whitespace-nowrap">⚡ 4+ bàn/trận</span>
                        )}
                        {isHT && !is4 && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 whitespace-nowrap">🎩 Hat-trick</span>
                        )}
                        {p.penalties > 0 && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600 whitespace-nowrap">{p.penalties} penalty</span>
                        )}
                        {p.own_goals > 0 && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-50 text-red-500 whitespace-nowrap">{p.own_goals} phản lưới</span>
                        )}
                      </div>

                      {/* Goal events timeline */}
                      <div className="flex flex-wrap gap-1">
                        {p.events
                          .filter(e => !e.is_own_goal && p.goalsByMatch[e.match_id])
                          .sort((a, b) => (a.minute ?? 999) - (b.minute ?? 999))
                          .map((e, j) => (
                            <span
                              key={j}
                              title={e.is_penalty ? 'Penalty' : 'Bàn thắng'}
                              className={`inline-flex items-center gap-0.5 text-[11px] px-2 py-0.5 rounded-full font-mono font-medium ${
                                e.is_penalty
                                  ? 'bg-blue-50 text-blue-600'
                                  : 'bg-green-50 text-green-700'
                              }`}
                            >
                              ⚽ {e.minute != null ? `${e.minute}'` : '?'}
                              {e.is_penalty && <span className="text-[9px]"> P</span>}
                            </span>
                          ))
                        }
                        {/* Own goal events */}
                        {p.events
                          .filter(e => e.is_own_goal)
                          .sort((a, b) => (a.minute ?? 999) - (b.minute ?? 999))
                          .map((e, j) => (
                            <span key={`og-${j}`}
                              className="inline-flex items-center gap-0.5 text-[11px] px-2 py-0.5 rounded-full font-mono font-medium bg-red-50 text-red-500"
                              title="Phản lưới nhà"
                            >
                              🔴 {e.minute != null ? `${e.minute}'` : '?'} OG
                            </span>
                          ))
                        }
                      </div>

                      {/* Per-match breakdown if multiple matches */}
                      {matchGoalCounts.length > 1 && (
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {Object.entries(p.goalsByMatch)
                            .sort(([, a], [, b]) => b - a)
                            .map(([matchId, count]) => (
                              <Link key={matchId} href={`/matches/${matchId}`}
                                className="text-[10px] text-slate-500 bg-slate-100 hover:bg-slate-200 px-1.5 py-0.5 rounded transition-colors"
                              >
                                {count} bàn/trận
                              </Link>
                            ))
                          }
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Own goals against ── */}
      {showGoals && ownGoalsAgainst.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 bg-slate-50">
            <h2 className="font-bold text-sm text-slate-700">Bàn thắng từ phản lưới đối thủ</h2>
          </div>
          <div className="divide-y divide-slate-50">
            {ownGoalsAgainst.map((g, i) => (
              <div key={i} className="px-5 py-3 flex items-center gap-3">
                <span className="text-sm text-red-500 font-medium">{g.player_name}</span>
                <span className="text-xs text-slate-400">({g.team_name})</span>
                {g.minute != null && (
                  <span className="ml-auto text-xs bg-red-50 text-red-500 px-2 py-0.5 rounded font-mono">{g.minute}'</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────

function MatchSection({ title, accent = 'text-slate-700', children }: { title: string; accent?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <div className="px-5 py-3 border-b border-slate-100 bg-slate-50">
        <h2 className={`font-bold text-sm ${accent}`}>{title}</h2>
      </div>
      <div className="divide-y divide-slate-50">{children}</div>
    </div>
  )
}

function MatchRow({ match: m, teamName, goals, showGoals }: { match: Match; teamName: string; goals: MatchGoal[]; showGoals: boolean }) {
  const isHome     = m.home_team === teamName
  const opponent   = isHome ? m.away_team : m.home_team
  const oppFlag    = isHome ? m.away_flag : m.home_flag
  const isFinished = m.status === 'finished'
  const isLive     = m.status === 'live'
  const myScore    = isHome ? m.home_score : m.away_score
  const theirScore = isHome ? m.away_score : m.home_score

  const result = isFinished && myScore != null && theirScore != null
    ? myScore > theirScore ? 'W' : myScore < theirScore ? 'L' : 'D'
    : null
  const resultStyle: Record<string, string> = {
    W: 'bg-green-100 text-green-700', L: 'bg-red-100 text-red-600', D: 'bg-amber-100 text-amber-600',
  }

  // Goals for this team (excluding OG by own players, but including OG by opponents)
  const myGoals   = goals.filter(g => g.team_name === teamName && !g.is_own_goal)
  const ogAgainst = goals.filter(g => g.team_name !== teamName && g.is_own_goal)
  const allMyGoals = [...myGoals, ...ogAgainst].sort((a, b) => (a.minute ?? 0) - (b.minute ?? 0))

  const conceded  = goals.filter(g => g.team_name !== teamName && !g.is_own_goal)
  const ogOwn     = goals.filter(g => g.team_name === teamName && g.is_own_goal)
  const allConceded = [...conceded, ...ogOwn].sort((a, b) => (a.minute ?? 0) - (b.minute ?? 0))

  const times = (!isFinished && !isLive) ? fmtMatchTimes(m.match_time) : null

  return (
    <Link href={`/matches/${m.id}`} className="block px-5 py-4 hover:bg-slate-50 transition-colors">
      <div className="flex items-center gap-3">
        {/* Stage */}
        <div className="text-[10px] text-slate-400 w-14 shrink-0 leading-tight">
          <div className="font-medium">{STAGE_LABELS[m.stage] ?? m.stage}</div>
          {m.group_name && <div>{m.group_name}</div>}
          <div className="text-slate-300">{fmtDate(m.match_time)}</div>
        </div>

        {/* Opponent */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <FlagImg team={opponent} flag={oppFlag} size="sm" href={teamHref(opponent)} />
          <span className="text-sm font-medium text-slate-700 truncate">{opponent}</span>
        </div>

        {/* Score / time */}
        <div className="shrink-0 text-center w-24">
          {isFinished || isLive ? (
            <div className="flex items-center justify-center gap-1.5">
              {result && <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${resultStyle[result]}`}>{result}</span>}
              <span className={`font-bold tabular-nums text-sm ${isLive ? 'text-red-600' : 'text-slate-800'}`}>
                {isHome ? `${myScore}–${theirScore}` : `${theirScore}–${myScore}`}
              </span>
            </div>
          ) : times ? (
            <div className="text-center">
              <div className="text-xs font-bold text-slate-700 tabular-nums">{times.vnTime}</div>
              <div className="text-[10px] text-slate-400">{times.vnDate}</div>
              <div className="text-[10px] text-slate-400">UTC {times.utcTime}</div>
            </div>
          ) : null}
        </div>
      </div>

      {/* Goals breakdown inline under the row */}
      {showGoals && (allMyGoals.length > 0 || allConceded.length > 0) && (
        <div className="mt-2 ml-[4.5rem] flex gap-4 flex-wrap">
          {allMyGoals.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {allMyGoals.map((g, i) => (
                <span key={i} className="text-[11px] text-green-700 bg-green-50 px-1.5 py-0.5 rounded font-medium">
                  ⚽ {g.player_name}{g.is_own_goal ? ' (OG)' : ''}{g.is_penalty ? ' (P)' : ''}{g.minute != null ? ` ${g.minute}'` : ''}
                </span>
              ))}
            </div>
          )}
          {allConceded.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {allConceded.map((g, i) => (
                <span key={i} className="text-[11px] text-red-500 bg-red-50 px-1.5 py-0.5 rounded font-medium">
                  ⚽ {g.player_name}{g.is_own_goal ? ' (OG)' : ''}{g.is_penalty ? ' (P)' : ''}{g.minute != null ? ` ${g.minute}'` : ''}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </Link>
  )
}

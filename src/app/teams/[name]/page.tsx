'use client'
import React, { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import FlagImg from '@/components/FlagImg'
import { fmtMatchTimes, teamHref, teamSlug } from '@/lib/time'
import type { Match, MatchGoal } from '@/types'

const STAGE_LABELS: Record<string, string> = {
  group: 'Vòng bảng', round_of_32: 'Vòng 1/16', round_of_16: 'Vòng 1/8',
  quarter: 'Tứ kết', semi: 'Bán kết', final: 'Chung kết',
}

interface GoalWithMatch extends MatchGoal {
  matches?: { home_team: string; away_team: string }
}

interface PlayerStat {
  player_name: string
  goals: number
  penalties: number
  own_goals: number
  minutes: number[]
}

export default function TeamPage() {
  const params = useParams()
  const slug = decodeURIComponent(params.name as string)
  const supabase = createClient()

  const [matches, setMatches] = useState<Match[]>([])
  const [teamName, setTeamName] = useState('')
  const [goals, setGoals] = useState<GoalWithMatch[]>([])
  const [teamFlag, setTeamFlag] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      // Find the canonical team name from the slug by fetching a sample match
      const [{ data: homeMatches }, { data: awayMatches }] = await Promise.all([
        supabase.from('matches').select('*').order('match_time'),
        supabase.from('matches').select('home_team,away_team').order('match_time'),
      ])
      const allM = (homeMatches ?? []) as Match[]
      // Find team whose slug matches
      const allTeams = new Set<string>()
      allM.forEach(m => { allTeams.add(m.home_team); allTeams.add(m.away_team) })
      const canonical = [...allTeams].find(t => teamSlug(t) === slug) ?? slug.replace(/-/g, ' ')
      setTeamName(canonical)

      const [{ data: hm }, { data: am }] = await Promise.all([
        supabase.from('matches').select('*').eq('home_team', canonical).order('match_time'),
        supabase.from('matches').select('*').eq('away_team', canonical).order('match_time'),
      ])
      const all = [...(hm ?? []), ...(am ?? [])]
        .sort((a, b) => new Date(a.match_time).getTime() - new Date(b.match_time).getTime())
      setMatches(all)

      // Detect flag from matches
      const withFlag = all.find(m => m.home_team === teamName ? m.home_flag : m.away_flag)
      if (withFlag) {
        setTeamFlag(withFlag.home_team === teamName ? withFlag.home_flag : withFlag.away_flag)
      }

      const matchIds = all.map(m => m.id)
      if (matchIds.length > 0) {
        const { data: goalData } = await supabase
          .from('match_goals')
          .select('*')
          .in('match_id', matchIds)
          .order('minute')
        setGoals((goalData ?? []) as GoalWithMatch[])
      }

      setLoading(false)
    }
    load()
  }, [teamName])

  // Player stats aggregated
  const playerStats: PlayerStat[] = Object.values(
    goals
      .filter(g => g.team_name === teamName)
      .reduce<Record<string, PlayerStat>>((acc, g) => {
        if (!acc[g.player_name]) acc[g.player_name] = { player_name: g.player_name, goals: 0, penalties: 0, own_goals: 0, minutes: [] }
        if (g.is_own_goal) acc[g.player_name].own_goals++
        else {
          acc[g.player_name].goals++
          if (g.is_penalty) acc[g.player_name].penalties++
        }
        if (g.minute != null) acc[g.player_name].minutes.push(g.minute)
        return acc
      }, {})
  ).sort((a, b) => b.goals - a.goals)

  // Goals grouped by match
  const goalsByMatch = goals.reduce<Record<string, MatchGoal[]>>((acc, g) => {
    if (!acc[g.match_id]) acc[g.match_id] = []
    acc[g.match_id].push(g)
    return acc
  }, {})

  const finished = matches.filter(m => m.status === 'finished')
  const upcoming = matches.filter(m => m.status === 'scheduled' || m.status === 'cancelled')
  const live = matches.filter(m => m.status === 'live')

  const totalGoalsFor = goals.filter(g => g.team_name === teamName && !g.is_own_goal).length
  const totalGoalsAgainst = goals.filter(g => g.team_name !== teamName && !g.is_own_goal).length +
    goals.filter(g => g.team_name === teamName && g.is_own_goal).length

  const wins = finished.filter(m => {
    const isHome = m.home_team === teamName
    return isHome ? (m.home_score ?? 0) > (m.away_score ?? 0) : (m.away_score ?? 0) > (m.home_score ?? 0)
  }).length
  const draws = finished.filter(m => m.home_score === m.away_score).length
  const losses = finished.length - wins - draws

  if (loading) return (
    <div className="space-y-4 animate-pulse">
      <div className="h-32 bg-white rounded-2xl border border-slate-200" />
      {[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-white rounded-xl border border-slate-200" />)}
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
      {/* Team header */}
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
            { label: 'Thắng', value: wins, color: 'text-green-600', bg: 'bg-green-50' },
            { label: 'Hòa', value: draws, color: 'text-amber-500', bg: 'bg-amber-50' },
            { label: 'Thua', value: losses, color: 'text-red-500', bg: 'bg-red-50' },
            { label: 'Bàn vào', value: totalGoalsFor, color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: 'Bàn thủng', value: totalGoalsAgainst, color: 'text-slate-600', bg: 'bg-slate-100' },
          ].map(s => (
            <div key={s.label} className={`${s.bg} rounded-xl py-3`}>
              <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-[11px] text-slate-400 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Live matches */}
      {live.length > 0 && (
        <Section title="Đang thi đấu" accent="text-red-500">
          {live.map(m => <MatchRow key={m.id} match={m} teamName={teamName} goals={goalsByMatch[m.id] ?? []} />)}
        </Section>
      )}

      {/* Upcoming */}
      {upcoming.length > 0 && (
        <Section title="Sắp thi đấu">
          {upcoming.map(m => <MatchRow key={m.id} match={m} teamName={teamName} goals={[]} />)}
        </Section>
      )}

      {/* Finished */}
      {finished.length > 0 && (
        <Section title="Đã thi đấu">
          {finished.map(m => <MatchRow key={m.id} match={m} teamName={teamName} goals={goalsByMatch[m.id] ?? []} />)}
        </Section>
      )}

      {/* Player stats */}
      {playerStats.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="font-bold text-slate-800">Thống kê cầu thủ</h2>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs text-slate-400 font-semibold">
                <th className="px-5 py-3">Cầu thủ</th>
                <th className="px-4 py-3 text-center">Bàn</th>
                <th className="px-4 py-3 text-center">Penalty</th>
                <th className="px-4 py-3 text-center">OG</th>
                <th className="px-4 py-3">Phút ghi bàn</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {playerStats.map((p, i) => (
                <tr key={p.player_name} className="hover:bg-slate-50">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500">{i + 1}</span>
                      <span className="text-sm font-medium text-slate-800">{p.player_name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="font-bold text-green-600">{p.goals}</span>
                  </td>
                  <td className="px-4 py-3 text-center text-xs text-slate-400">
                    {p.penalties > 0 ? <span className="bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded font-medium">{p.penalties}P</span> : '—'}
                  </td>
                  <td className="px-4 py-3 text-center text-xs text-slate-400">
                    {p.own_goals > 0 ? <span className="bg-red-100 text-red-500 px-1.5 py-0.5 rounded font-medium">{p.own_goals}</span> : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {p.minutes.sort((a, b) => a - b).map((min, j) => (
                        <span key={j} className="text-[11px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono">{min}'</span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function Section({ title, accent = 'text-slate-700', children }: { title: string; accent?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <div className="px-5 py-3 border-b border-slate-100 bg-slate-50">
        <h2 className={`font-bold text-sm ${accent}`}>{title}</h2>
      </div>
      <div className="divide-y divide-slate-50">{children}</div>
    </div>
  )
}

function MatchRow({ match: m, teamName, goals }: { match: Match; teamName: string; goals: MatchGoal[] }) {
  const isHome = m.home_team === teamName
  const opponent = isHome ? m.away_team : m.home_team
  const opponentFlag = isHome ? m.away_flag : m.home_flag
  const isFinished = m.status === 'finished'
  const isLive = m.status === 'live'

  const myScore = isHome ? m.home_score : m.away_score
  const theirScore = isHome ? m.away_score : m.home_score

  const result = isFinished && myScore != null && theirScore != null
    ? myScore > theirScore ? 'W' : myScore < theirScore ? 'L' : 'D'
    : null

  const resultStyle = result === 'W' ? 'bg-green-100 text-green-700' : result === 'L' ? 'bg-red-100 text-red-600' : result === 'D' ? 'bg-amber-100 text-amber-600' : ''

  const teamGoals = goals.filter(g => g.team_name === teamName && !g.is_own_goal)
  const times = (!isFinished && !isLive) ? fmtMatchTimes(m.match_time) : null

  return (
    <Link href={`/matches/${m.id}`} className="flex items-center gap-3 px-5 py-4 hover:bg-slate-50 transition-colors">
      <div className="text-[10px] text-slate-400 w-16 shrink-0 leading-tight">
        <div className="font-medium text-slate-500">{STAGE_LABELS[m.stage] ?? m.stage}</div>
        {m.group_name && <div>{m.group_name}</div>}
      </div>

      <div className="flex items-center gap-2 flex-1 min-w-0">
        <FlagImg team={opponent} flag={opponentFlag} size="sm" />
        <span className="text-sm font-medium text-slate-700 truncate">{opponent}</span>
      </div>

      <div className="shrink-0 text-center w-20">
        {isFinished || isLive ? (
          <div className="flex items-center justify-center gap-1.5">
            {result && (
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${resultStyle}`}>{result}</span>
            )}
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

      {teamGoals.length > 0 && (
        <div className="shrink-0 hidden sm:flex flex-col gap-0.5 min-w-[120px]">
          {teamGoals.map((g, i) => (
            <div key={i} className="flex items-center gap-1 text-[11px] text-slate-500">
              <span className="text-slate-300">⚽</span>
              <span className="font-medium text-slate-700 truncate max-w-[80px]">{g.player_name}</span>
              {g.minute != null && <span className="text-slate-400 font-mono shrink-0">{g.minute}'</span>}
              {g.is_penalty && <span className="text-amber-500 shrink-0">(P)</span>}
            </div>
          ))}
        </div>
      )}
    </Link>
  )
}

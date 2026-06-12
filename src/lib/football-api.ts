import { getFlagUrl } from './flag-map'
import type { FixtureRow } from '@/types'

const JSON_URL = 'https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json'

interface RawGoal {
  name?: string
  minute?: number
  score?: [number, number]
  team?: number   // 1 = home, 2 = away
  og?: boolean    // own goal
  pen?: boolean   // penalty
}

interface RawFixture {
  team1?: string
  team2?: string
  date?: string
  time?: string
  round?: string
  group?: string
  ground?: string
  score?: { ft?: [number, number] }
  goals?: RawGoal[]
}

interface WorldCupJson {
  matches?: RawFixture[]
}

export interface GoalRow {
  player_name: string
  team_name: string
  team_flag: string | null
  minute: number | null
  is_own_goal: boolean
  is_penalty: boolean
}

export interface FixtureWithGoals {
  fixture: FixtureRow
  goals: GoalRow[]
}

export async function fetchFixtures(): Promise<WorldCupJson> {
  const res = await fetch(JSON_URL, { cache: 'no-store' })
  if (!res.ok) throw new Error(`GitHub fetch failed: ${res.status}`)
  return res.json() as Promise<WorldCupJson>
}

export function mapFixturesToMatches(data: WorldCupJson): FixtureRow[] {
  return (data.matches ?? []).map((m: RawFixture) => {
    const hasScore = m.score?.ft != null
    return {
      home_team: m.team1 ?? '',
      away_team: m.team2 ?? '',
      home_flag: getFlagUrl(m.team1 ?? '', 40),
      away_flag: getFlagUrl(m.team2 ?? '', 40),
      match_time: parseMatchTime(m.date ?? '', m.time),
      stage: mapRound(m.round ?? ''),
      group_name: m.group ?? null,
      venue: m.ground ?? null,
      status: hasScore ? 'finished' : 'scheduled',
      home_score: hasScore ? (m.score!.ft![0]) : null,
      away_score: hasScore ? (m.score!.ft![1]) : null,
      api_fixture_id: null,
    }
  })
}

export function mapFixturesWithGoals(data: WorldCupJson): FixtureWithGoals[] {
  return (data.matches ?? [])
    .filter((m: RawFixture) => m.score?.ft != null && (m.goals?.length ?? 0) > 0)
    .map((m: RawFixture) => {
      const fixture: FixtureRow = {
        home_team: m.team1 ?? '',
        away_team: m.team2 ?? '',
        home_flag: getFlagUrl(m.team1 ?? '', 40),
        away_flag: getFlagUrl(m.team2 ?? '', 40),
        match_time: parseMatchTime(m.date ?? '', m.time),
        stage: mapRound(m.round ?? ''),
        group_name: m.group ?? null,
        venue: m.ground ?? null,
        status: 'finished',
        home_score: m.score!.ft![0],
        away_score: m.score!.ft![1],
        api_fixture_id: null,
      }

      const goals: GoalRow[] = (m.goals ?? [])
        .filter((g: RawGoal) => g.name)
        .map((g: RawGoal) => {
          const teamName = g.team === 2 ? (m.team2 ?? '') : (m.team1 ?? '')
          const flagTeam = g.og
            ? (g.team === 2 ? (m.team1 ?? '') : (m.team2 ?? ''))  // own goal: credited to other team
            : teamName
          return {
            player_name: g.name!,
            team_name: g.og
              ? (g.team === 2 ? (m.team1 ?? '') : (m.team2 ?? ''))
              : teamName,
            team_flag: getFlagUrl(flagTeam, 40),
            minute: g.minute ?? null,
            is_own_goal: g.og ?? false,
            is_penalty: g.pen ?? false,
          }
        })

      return { fixture, goals }
    })
}

function parseMatchTime(date: string, time?: string): string {
  if (!time) return `${date}T00:00:00Z`
  const match = time.match(/^(\d{1,2}):(\d{2})\s*UTC([+-]\d+)$/)
  if (!match) return `${date}T00:00:00Z`
  const hours = parseInt(match[1])
  const minutes = parseInt(match[2])
  const offset = parseInt(match[3])
  const totalMinutes = hours * 60 + minutes - offset * 60
  const utcDate = new Date(`${date}T00:00:00Z`)
  utcDate.setUTCMinutes(utcDate.getUTCMinutes() + totalMinutes)
  return utcDate.toISOString()
}

function mapRound(round: string): string {
  const r = round.toLowerCase()
  if (r.includes('matchday') || r.includes('group')) return 'group'
  if (r.includes('round of 32')) return 'round_of_32'
  if (r.includes('round of 16')) return 'round_of_16'
  if (r.includes('quarter')) return 'quarter'
  if (r.includes('semi')) return 'semi'
  if (r.includes('final')) return 'final'
  return 'group'
}

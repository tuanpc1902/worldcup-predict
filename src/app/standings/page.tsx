import { createServerSupabase } from '@/lib/supabase-server'
import StandingsClient from './StandingsClient'
import type { Match, TopScorer } from '@/types'

export const revalidate = 300

interface RawGoalRow {
  player_name: string
  team_name: string
  team_flag: string | null
  is_penalty: boolean
}

export default async function StandingsPage() {
  const supabase = await createServerSupabase()

  const [{ data: rawMatches }, { data: rawGoals }] = await Promise.all([
    supabase
      .from('matches')
      .select('id,home_team,away_team,home_flag,away_flag,home_score,away_score,status,group_name,stage,match_time')
      .eq('stage', 'group')
      .not('group_name', 'is', null)
      .order('match_time', { ascending: true }),
    supabase
      .from('match_goals')
      .select('player_name,team_name,team_flag,is_penalty')
      .eq('is_own_goal', false),   // don't count own goals in top scorers
  ])

  const matches = (rawMatches ?? []) as Match[]

  // Aggregate goals per player
  const scorerMap = new Map<string, TopScorer>()
  for (const g of (rawGoals ?? []) as RawGoalRow[]) {
    const key = `${g.player_name}||${g.team_name}`
    const existing = scorerMap.get(key)
    if (existing) {
      existing.goals++
      if (g.is_penalty) existing.penalties++
    } else {
      scorerMap.set(key, {
        player_name: g.player_name,
        team_name: g.team_name,
        team_flag: g.team_flag,
        goals: 1,
        penalties: g.is_penalty ? 1 : 0,
      })
    }
  }

  const topScorers: TopScorer[] = Array.from(scorerMap.values())
    .sort((a, b) => b.goals - a.goals || a.player_name.localeCompare(b.player_name))

  return <StandingsClient matches={matches} topScorers={topScorers} />
}

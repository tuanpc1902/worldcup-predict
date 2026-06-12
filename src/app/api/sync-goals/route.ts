import { NextResponse } from 'next/server'
import { createServiceSupabase } from '@/lib/supabase-server'
import { fetchFixtures, mapFixturesWithGoals } from '@/lib/football-api'
import type { GoalRow } from '@/lib/football-api'

async function run() {
  const supabase = createServiceSupabase()

  const data = await fetchFixtures()
  const withGoals = mapFixturesWithGoals(data)

  if (withGoals.length === 0) {
    return NextResponse.json({ message: 'No goals data yet in openfootball JSON' })
  }

  const { data: dbMatches } = await supabase
    .from('matches')
    .select('id, home_team, away_team')

  type DbMatch = { id: string; home_team: string; away_team: string }
  const matchMap = new Map<string, string>()
  for (const m of (dbMatches ?? []) as DbMatch[]) {
    matchMap.set(`${m.home_team}|${m.away_team}`, m.id)
  }

  let synced = 0, skipped = 0
  const errors: string[] = []

  for (const { fixture, goals } of withGoals) {
    const matchId = matchMap.get(`${fixture.home_team}|${fixture.away_team}`)
    if (!matchId || goals.length === 0) { skipped++; continue }

    await supabase.from('match_goals').delete().eq('match_id', matchId)
    const rows = goals.map((g: GoalRow) => ({ ...g, match_id: matchId }))
    const { error } = await supabase.from('match_goals').insert(rows)
    if (error) errors.push(`${fixture.home_team} vs ${fixture.away_team}: ${error.message}`)
    else synced++
  }

  return NextResponse.json({
    message: `Synced goals for ${synced} matches, skipped ${skipped}`,
    errors: errors.length > 0 ? errors : undefined,
  })
}

export async function GET() {
  try { return await run() }
  catch (err) {
    return NextResponse.json({ message: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 })
  }
}

export async function POST() {
  try { return await run() }
  catch (err) {
    return NextResponse.json({ message: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 })
  }
}

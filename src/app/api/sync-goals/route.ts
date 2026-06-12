import { NextRequest, NextResponse } from 'next/server'
import { createServiceSupabase } from '@/lib/supabase-server'
import { fetchFixtures, mapFixturesWithGoals } from '@/lib/football-api'
import type { GoalRow } from '@/lib/football-api'

export async function POST(req: NextRequest) {
  // Auth: must be admin
  const isAdmin = await checkAdmin(req)
  if (!isAdmin) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

  try {
    const supabase = createServiceSupabase()

    // 1. Fetch raw fixture JSON (includes goals)
    const data = await fetchFixtures()
    const withGoals = mapFixturesWithGoals(data)

    if (withGoals.length === 0) {
      return NextResponse.json({ message: 'Không có dữ liệu goals trong JSON (có thể chưa có trận nào kết thúc hoặc openfootball chưa cập nhật)' })
    }

    // 2. Build match lookup: "home|away|time" → id
    const { data: dbMatches } = await supabase
      .from('matches')
      .select('id, home_team, away_team, match_time')

    type DbMatch = { id: string; home_team: string; away_team: string; match_time: string }
    const matchMap = new Map<string, string>()
    for (const m of (dbMatches ?? []) as DbMatch[]) {
      matchMap.set(`${m.home_team}|${m.away_team}`, m.id)
    }

    // 3. For each finished match with goals, delete old rows then insert fresh
    let synced = 0
    let skipped = 0
    const errors: string[] = []

    for (const { fixture, goals } of withGoals) {
      const matchId = matchMap.get(`${fixture.home_team}|${fixture.away_team}`)
      if (!matchId) { skipped++; continue }
      if (goals.length === 0) { skipped++; continue }

      // Delete existing goals for this match (full replace strategy)
      await supabase.from('match_goals').delete().eq('match_id', matchId)

      const rows = goals.map((g: GoalRow) => ({ ...g, match_id: matchId }))
      const { error } = await supabase.from('match_goals').insert(rows)
      if (error) {
        errors.push(`${fixture.home_team} vs ${fixture.away_team}: ${error.message}`)
      } else {
        synced++
      }
    }

    return NextResponse.json({
      message: `Synced goals for ${synced} matches, skipped ${skipped}`,
      total_fixtures_with_goals: withGoals.length,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ message: msg }, { status: 500 })
  }
}

async function checkAdmin(req: NextRequest): Promise<boolean> {
  try {
    const authHeader = req.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    if (cronSecret && authHeader === `Bearer ${cronSecret}`) return true
    const { createServerSupabase } = await import('@/lib/supabase-server')
    const supabase = await createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false
    const { data } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
    return data?.role === 'admin'
  } catch {
    return false
  }
}

import { NextResponse } from 'next/server'
import { createServiceSupabase } from '@/lib/supabase-server'
import { isPlaceholder } from '@/lib/team-utils'

export async function GET() {
  try {
    const supabase = createServiceSupabase()

    const { count: matchCount, error: e1 } = await supabase
      .from('matches')
      .select('*', { count: 'exact', head: true })

    const { count: profileCount, error: e2 } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })

    // Test anon read
    const { createServerSupabase } = await import('@/lib/supabase-server')
    const anonSupabase = await createServerSupabase()
    const { data: anonMatches, error: e3 } = await anonSupabase
      .from('matches')
      .select('id, home_team, away_team, status')
      .limit(3)

    // All distinct teams from DB
    const { data: homeTeams } = await supabase.from('matches').select('home_team')
    const { data: awayTeams } = await supabase.from('matches').select('away_team')

    const allNames = new Set<string>()
    ;(homeTeams ?? []).forEach((r: any) => { if (r.home_team) allNames.add(r.home_team) })
    ;(awayTeams ?? []).forEach((r: any) => { if (r.away_team) allNames.add(r.away_team) })

    const realTeams = [...allNames].filter(n => !isPlaceholder(n)).sort()
    const placeholders = [...allNames].filter(n => isPlaceholder(n)).sort()

    return NextResponse.json({
      service_role: {
        matches: matchCount,
        matchError: e1?.message ?? null,
        profiles: profileCount,
        profileError: e2?.message ?? null,
      },
      teams: {
        total_in_db: allNames.size,
        real_teams_count: realTeams.length,
        real_teams: realTeams,
        placeholders_filtered_out: placeholders,
      },
      anon_read: {
        matches: anonMatches,
        error: e3?.message ?? null,
      },
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

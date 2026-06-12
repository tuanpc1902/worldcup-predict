import { NextResponse } from 'next/server'
import { createServiceSupabase } from '@/lib/supabase-server'
import { fetchFixtures, mapFixtureToMatch } from '@/lib/football-api'

export async function POST() {
  if (!process.env.FOOTBALL_API_KEY) {
    return NextResponse.json({ message: 'FOOTBALL_API_KEY chưa được cấu hình' }, { status: 400 })
  }

  try {
    const fixtures = await fetchFixtures()
    const supabase = createServiceSupabase()
    let upserted = 0

    for (const f of fixtures) {
      const match = mapFixtureToMatch(f)
      const { error } = await supabase
        .from('matches')
        .upsert({ ...match, api_synced_at: new Date().toISOString() }, { onConflict: 'api_fixture_id' })

      if (!error) upserted++
    }

    return NextResponse.json({ message: `Sync thành công ${upserted}/${fixtures.length} trận` })
  } catch (err: any) {
    return NextResponse.json({ message: err.message }, { status: 500 })
  }
}

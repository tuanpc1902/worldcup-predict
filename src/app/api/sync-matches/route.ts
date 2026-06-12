import { NextResponse } from 'next/server'
import { createServiceSupabase } from '@/lib/supabase-server'
import { fetchFixtures, mapFixturesToMatches } from '@/lib/football-api'

export async function POST() {
  try {
    const data = await fetchFixtures()
    const matches = mapFixturesToMatches(data)

    if (matches.length === 0) {
      return NextResponse.json({ message: 'Không có trận nào trong dữ liệu' }, { status: 400 })
    }

    const supabase = createServiceSupabase()
    let upserted = 0

    for (const match of matches) {
      // dùng home+away+time làm unique key vì không có api_fixture_id
      const { error } = await supabase
        .from('matches')
        .upsert(
          { ...match, api_synced_at: new Date().toISOString() },
          { onConflict: 'home_team,away_team,match_time', ignoreDuplicates: false }
        )
      if (!error) upserted++
    }

    return NextResponse.json({ message: `Sync thành công ${upserted}/${matches.length} trận từ openfootball` })
  } catch (err: any) {
    return NextResponse.json({ message: err.message }, { status: 500 })
  }
}

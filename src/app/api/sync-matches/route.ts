import { NextRequest, NextResponse } from 'next/server'
import { createServiceSupabase } from '@/lib/supabase-server'
import { fetchFixtures, mapFixturesToMatches } from '@/lib/football-api'

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    const isAdmin = await checkAdmin(req)
    if (!isAdmin) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }
  }

  try {
    const supabase = createServiceSupabase()

    // 1. Load all existing DB matches in ONE query → build lookup map
    const { data: dbRows, error: fetchErr } = await supabase
      .from('matches')
      .select('id, home_team, away_team, match_time, status, home_flag, away_flag')

    if (fetchErr) {
      return NextResponse.json({ message: `DB read error: ${fetchErr.message}` }, { status: 500 })
    }

    // Key: "home|away|match_time" → { id, status, home_flag, away_flag }
    type DbRow = { id: string; home_team: string; away_team: string; match_time: string; status: string; home_flag: string | null; away_flag: string | null }
    const dbMap = new Map<string, DbRow>()
    for (const row of (dbRows ?? []) as DbRow[]) {
      dbMap.set(rowKey(row.home_team, row.away_team, row.match_time), row)
    }

    // 2. Fetch fixture data from GitHub
    const data = await fetchFixtures()
    const fixtures = mapFixturesToMatches(data)

    if (fixtures.length === 0) {
      return NextResponse.json({ message: 'Không có trận nào trong dữ liệu' }, { status: 400 })
    }

    const now = new Date()
    let inserted = 0
    let updated = 0
    let skipped = 0
    let scored = 0
    const errors: string[] = []

    for (const fixture of fixtures) {
      const key = rowKey(fixture.home_team, fixture.away_team, fixture.match_time)
      const existing = dbMap.get(key)

      if (existing) {
        // Already finished in DB → nothing will ever change, skip entirely
        if (existing.status === 'finished') {
          skipped++
          continue
        }

        // Future match, not yet started, no score in source → skip (no change)
        const kickoff = new Date(fixture.match_time)
        if (kickoff > now && fixture.status === 'scheduled') {
          skipped++
          continue
        }

        // Match just got a result OR status changed → update
        const updatePayload: Record<string, string | number | null | boolean> = {
          home_score: fixture.home_score,
          away_score: fixture.away_score,
          status: fixture.status,
          api_synced_at: now.toISOString(),
        }
        // Backfill missing flags (e.g. after flag-map was updated)
        if (!existing.home_flag && fixture.home_flag) updatePayload.home_flag = fixture.home_flag
        if (!existing.away_flag && fixture.away_flag) updatePayload.away_flag = fixture.away_flag

        const { error: updateErr } = await supabase
          .from('matches')
          .update(updatePayload)
          .eq('id', existing.id)

        if (updateErr) {
          errors.push(`UPDATE (${fixture.home_team} vs ${fixture.away_team}): ${updateErr.message}`)
        } else {
          updated++
          // Auto-score if newly finished
          if (fixture.status === 'finished' && existing.status !== 'finished') {
            const { error: scoreErr } = await supabase.rpc('score_match', { p_match_id: existing.id })
            if (!scoreErr) scored++
          }
        }
      } else {
        // New match → insert
        const { error: insertErr } = await supabase.from('matches').insert({
          ...fixture,
          api_synced_at: now.toISOString(),
        })
        if (insertErr) {
          errors.push(`INSERT (${fixture.home_team} vs ${fixture.away_team}): ${insertErr.message}`)
          if (errors.length === 1) break
        } else {
          inserted++
        }
      }
    }

    return NextResponse.json({
      message: `Inserted ${inserted}, updated ${updated}, skipped ${skipped}, scored ${scored}`,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ message: msg }, { status: 500 })
  }
}

function rowKey(home: string, away: string, matchTime: string): string {
  // Normalise ISO string to avoid timezone formatting differences
  return `${home}|${away}|${new Date(matchTime).toISOString()}`
}

async function checkAdmin(req: NextRequest): Promise<boolean> {
  try {
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

import { NextRequest, NextResponse } from 'next/server'
import { createServiceSupabase } from '@/lib/supabase-server'

// Syncs live scores from api-sports.io for matches currently "live" in DB.
// Called by Vercel Cron every minute.
// Requires env: FOOTBALL_API_KEY (api-sports.io key)
//               CRON_SECRET (optional, for auth)

const API_BASE = 'https://v3.football.api-sports.io'

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const apiKey = process.env.FOOTBALL_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'FOOTBALL_API_KEY not set' }, { status: 500 })
  }

  const supabase = createServiceSupabase()

  // 1. Find live + recently-started scheduled matches that have api_fixture_id
  const now = new Date()
  const tenMinsAgo = new Date(now.getTime() - 10 * 60 * 1000).toISOString()

  const { data: liveMatches } = await supabase
    .from('matches')
    .select('id, api_fixture_id, status, home_team, away_team')
    .not('api_fixture_id', 'is', null)
    .or(`status.eq.live,and(status.eq.scheduled,match_time.lte.${now.toISOString()},match_time.gte.${tenMinsAgo})`)

  if (!liveMatches || liveMatches.length === 0) {
    return NextResponse.json({ synced: 0, message: 'No live matches' })
  }

  const fixtureIds = (liveMatches as { api_fixture_id: number }[]).map(m => m.api_fixture_id).join('-')

  // 2. Fetch from api-sports.io (supports up to 20 fixture IDs in one call)
  const res = await fetch(`${API_BASE}/fixtures?ids=${fixtureIds}`, {
    headers: { 'x-apisports-key': apiKey },
    next: { revalidate: 0 }, // always fresh
  })

  if (!res.ok) {
    return NextResponse.json({ error: `api-sports.io error: ${res.status}` }, { status: 502 })
  }

  const json = await res.json()
  const fixtures: ApiFixture[] = json.response ?? []

  let synced = 0
  let scored = 0

  for (const fix of fixtures) {
    const match = (liveMatches as { id: string; api_fixture_id: number; status: string }[])
      .find(m => m.api_fixture_id === fix.fixture.id)
    if (!match) continue

    const homeScore = fix.goals.home ?? null
    const awayScore = fix.goals.away ?? null
    const apiStatus = fix.fixture.status.short // NS, 1H, HT, 2H, FT, etc.
    const dbStatus = mapStatus(apiStatus)

    const { error } = await supabase.from('matches').update({
      home_score: homeScore,
      away_score: awayScore,
      status: dbStatus,
      api_synced_at: now.toISOString(),
    }).eq('id', match.id)

    if (!error) {
      synced++
      // Auto-score when match transitions to finished
      if (dbStatus === 'finished' && match.status !== 'finished' && homeScore !== null && awayScore !== null) {
        const { error: scoreErr } = await supabase.rpc('score_match', { p_match_id: match.id })
        if (!scoreErr) scored++
      }
    }
  }

  return NextResponse.json({ synced, scored, fixtures: fixtures.length })
}

function mapStatus(short: string): 'scheduled' | 'live' | 'finished' {
  if (['NS', 'TBD', 'PST', 'CANC', 'SUSP', 'INT', 'ABD'].includes(short)) return 'scheduled'
  if (['FT', 'AET', 'PEN', 'AWD', 'WO'].includes(short)) return 'finished'
  return 'live' // 1H, HT, 2H, ET, BT, P, LIVE
}

interface ApiFixture {
  fixture: { id: number; status: { short: string } }
  goals: { home: number | null; away: number | null }
}

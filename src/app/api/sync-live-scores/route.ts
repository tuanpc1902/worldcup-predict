import { NextRequest, NextResponse } from 'next/server'
import { createServiceSupabase, createServerSupabase } from '@/lib/supabase-server'

// Called by cron-job.org every 5 minutes (recommended).
// Auth: CRON_SECRET header OR admin/staff session cookie.
// Smart: only fetches from api-sports.io when matches are actually in the active window.
// Active window: match_time - 10min to match_time + 150min (covers 90min + extra time + delays).

const API_BASE = 'https://v3.football.api-sports.io'

async function isAuthorized(req: NextRequest): Promise<boolean> {
  // 1. CRON_SECRET header (for cron-job.org)
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && req.headers.get('authorization') === `Bearer ${cronSecret}`) return true

  // 2. Admin/staff session (for manual trigger from admin UI)
  try {
    const supabase = await createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
    return profile?.role === 'admin' || profile?.role === 'staff'
  } catch {
    return false
  }
}

export async function GET(req: NextRequest) {
  if (!await isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const apiKey = process.env.FOOTBALL_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'FOOTBALL_API_KEY not set' }, { status: 500 })
  }

  const supabase = createServiceSupabase()
  const now = new Date()

  // Active window: matches that started within last 150 min or start in next 10 min
  const windowStart = new Date(now.getTime() - 150 * 60 * 1000).toISOString()
  const windowEnd   = new Date(now.getTime() + 10  * 60 * 1000).toISOString()

  const { data: activeMatches } = await supabase
    .from('matches')
    .select('id, api_fixture_id, status, home_team, away_team, home_score, away_score')
    .not('api_fixture_id', 'is', null)
    .neq('status', 'cancelled')
    // exclude matches that are already finished AND have a score recorded
    .or('status.neq.finished,home_score.is.null')
    .gte('match_time', windowStart)
    .lte('match_time', windowEnd)

  if (!activeMatches || activeMatches.length === 0) {
    return NextResponse.json({ synced: 0, scored: 0, message: 'No active matches in window — API not called' })
  }

  const fixtureIds = (activeMatches as { api_fixture_id: number }[])
    .map(m => m.api_fixture_id)
    .join('-')

  const res = await fetch(`${API_BASE}/fixtures?ids=${fixtureIds}`, {
    headers: { 'x-apisports-key': apiKey },
    cache: 'no-store',
  })

  if (!res.ok) {
    return NextResponse.json({ error: `api-sports.io ${res.status}` }, { status: 502 })
  }

  const json = await res.json()
  const fixtures: ApiFixture[] = json.response ?? []

  let synced = 0
  let scored = 0

  for (const fix of fixtures) {
    const match = (activeMatches as ActiveMatch[]).find(m => m.api_fixture_id === fix.fixture.id)
    if (!match) continue

    const homeScore = fix.goals.home ?? null
    const awayScore = fix.goals.away ?? null
    const dbStatus  = mapStatus(fix.fixture.status.short)

    const { error } = await supabase.from('matches').update({
      home_score: homeScore,
      away_score: awayScore,
      status: dbStatus,
      api_synced_at: now.toISOString(),
    }).eq('id', match.id)

    if (!error) {
      synced++
      // Auto-score predictions when match first transitions to finished
      if (dbStatus === 'finished' && match.status !== 'finished' && homeScore !== null && awayScore !== null) {
        const { error: scoreErr } = await supabase.rpc('score_match', { p_match_id: match.id })
        if (!scoreErr) scored++
      }
    }
  }

  return NextResponse.json({ synced, scored, checked: activeMatches.length, fixtures: fixtures.length })
}

// Sync a single match by match_id (admin/staff manual trigger)
export async function POST(req: NextRequest) {
  if (!await isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const apiKey = process.env.FOOTBALL_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'FOOTBALL_API_KEY not set' }, { status: 500 })
  }

  const { match_id } = await req.json()
  if (!match_id) return NextResponse.json({ error: 'match_id required' }, { status: 400 })

  const supabase = createServiceSupabase()

  const { data: match } = await supabase
    .from('matches')
    .select('id, api_fixture_id, status, home_score, away_score')
    .eq('id', match_id)
    .maybeSingle()

  if (!match || !match.api_fixture_id) {
    return NextResponse.json({ error: 'Match not found or has no api_fixture_id' }, { status: 404 })
  }

  const res = await fetch(`${API_BASE}/fixtures?id=${match.api_fixture_id}`, {
    headers: { 'x-apisports-key': apiKey },
    cache: 'no-store',
  })

  if (!res.ok) {
    return NextResponse.json({ error: `api-sports.io ${res.status}` }, { status: 502 })
  }

  const json = await res.json()
  const fix: ApiFixture | undefined = json.response?.[0]
  if (!fix) return NextResponse.json({ error: 'No fixture data returned' }, { status: 404 })

  const homeScore = fix.goals.home ?? null
  const awayScore = fix.goals.away ?? null
  const dbStatus  = mapStatus(fix.fixture.status.short)
  const now = new Date()

  await supabase.from('matches').update({
    home_score: homeScore,
    away_score: awayScore,
    status: dbStatus,
    api_synced_at: now.toISOString(),
  }).eq('id', match.id)

  let scored = false
  if (dbStatus === 'finished' && match.status !== 'finished' && homeScore !== null && awayScore !== null) {
    const { error } = await supabase.rpc('score_match', { p_match_id: match.id })
    if (!error) scored = true
  }

  return NextResponse.json({
    ok: true,
    status: dbStatus,
    score: homeScore !== null ? `${homeScore}–${awayScore}` : null,
    scored,
  })
}

function mapStatus(short: string): 'scheduled' | 'live' | 'finished' {
  if (['NS', 'TBD', 'PST', 'CANC', 'SUSP', 'INT', 'ABD'].includes(short)) return 'scheduled'
  if (['FT', 'AET', 'PEN', 'AWD', 'WO'].includes(short)) return 'finished'
  return 'live'
}

interface ApiFixture {
  fixture: { id: number; status: { short: string } }
  goals: { home: number | null; away: number | null }
}

interface ActiveMatch {
  id: string
  api_fixture_id: number
  status: string
  home_score: number | null
  away_score: number | null
}

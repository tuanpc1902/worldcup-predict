import { NextRequest, NextResponse } from 'next/server'
import { createServiceSupabase } from '@/lib/supabase-server'

/**
 * Manual trigger for admins (or fallback if pg_cron is unavailable).
 * The primary scheduler is pg_cron inside Supabase — see migration 20260613_live_status_cron.sql
 * - scheduled → live  : kick-off time has passed
 * - live → finished   : score already set by sync-matches
 */
export async function GET(req: NextRequest) {
  // Verify cron secret (Vercel sends Authorization: Bearer <CRON_SECRET>)
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceSupabase()
  const now = new Date().toISOString()

  // 1. scheduled → live: kick-off time has passed
  const { data: activated, error: e1 } = await supabase
    .from('matches')
    .update({ status: 'live' })
    .eq('status', 'scheduled')
    .lte('match_time', now)
    .select('id, home_team, away_team')

  if (e1) {
    return NextResponse.json({ message: e1.message }, { status: 500 })
  }

  // 2. live → finished guard: if a 'live' match has home_score set it means
  //    sync-matches already gave it a result but forgot to flip status — fix it.
  const { data: stuckLive, error: e2 } = await supabase
    .from('matches')
    .update({ status: 'finished' })
    .eq('status', 'live')
    .not('home_score', 'is', null)
    .not('away_score', 'is', null)
    .select('id, home_team, away_team')

  if (e2) {
    return NextResponse.json({ message: e2.message }, { status: 500 })
  }

  const toActivate = activated ?? []
  const toFinish   = stuckLive ?? []

  return NextResponse.json({
    now,
    activated: toActivate.length,
    finished:  toFinish.length,
    details: {
      activated: toActivate.map((m: { home_team: string; away_team: string }) => `${m.home_team} vs ${m.away_team}`),
      finished:  toFinish.map((m: { home_team: string; away_team: string }) => `${m.home_team} vs ${m.away_team}`),
    },
  })
}

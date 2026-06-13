import { NextRequest, NextResponse } from 'next/server'
import { createServiceSupabase } from '@/lib/supabase-server'
import { createClient } from '@supabase/supabase-js'

// POST /api/admin/reset
// body: { mode: 'game' | 'full', confirm: 'RESET' }
export async function POST(req: NextRequest) {
  const { mode, confirm } = await req.json()

  if (confirm !== 'RESET') {
    return NextResponse.json({ error: 'Cần confirm = "RESET"' }, { status: 400 })
  }
  if (!['game', 'full'].includes(mode)) {
    return NextResponse.json({ error: 'mode phải là "game" hoặc "full"' }, { status: 400 })
  }

  // Verify caller is admin via cookie session
  const supabase = createServiceSupabase()

  const authHeader = req.headers.get('authorization') ?? ''
  const token = authHeader.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
  const { data: { user }, error: authErr } = await adminClient.auth.getUser(token)
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const log: string[] = []

  try {
    // ── Always clear game data ──────────────────────────────────────────────
    await supabase.from('predictions').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    log.push('✓ predictions cleared')

    await supabase.from('group_members').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('groups').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    log.push('✓ groups + members cleared')

    await supabase.from('match_comments').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    log.push('✓ comments cleared')

    await supabase.from('champion_picks').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    log.push('✓ champion_picks cleared')

    await supabase.from('user_activity_logs').delete().neq('id', 0)
    log.push('✓ activity_logs cleared')

    await supabase.from('profiles').update({ total_points: 0 }).eq('role', 'user')
    log.push('✓ user points reset to 0')

    if (mode === 'full') {
      // Reset match results
      await supabase.from('match_goals').delete().neq('id', '00000000-0000-0000-0000-000000000000')
      log.push('✓ match_goals cleared')

      await supabase.from('matches').update({
        home_score: null,
        away_score: null,
        status: 'scheduled',
        is_locked: false,
      }).neq('id', '00000000-0000-0000-0000-000000000000')
      log.push('✓ match results reset')

      // Delete non-admin profiles (auth users must be deleted separately)
      await supabase.from('profiles').delete().eq('role', 'user')
      log.push('✓ user profiles deleted (auth users still exist — delete manually in Supabase Dashboard)')
    }

    return NextResponse.json({ success: true, log })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg, log }, { status: 500 })
  }
}

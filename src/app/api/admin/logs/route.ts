import { NextRequest, NextResponse } from 'next/server'
import { createServiceSupabase, createServerSupabase } from '@/lib/supabase-server'

async function verifyAdmin() {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
  return profile?.role === 'admin' ? user : null
}

export async function GET(req: NextRequest) {
  if (!await verifyAdmin()) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

  const url = req.nextUrl
  const action = url.searchParams.get('action') ?? ''
  const user_id = url.searchParams.get('user_id') ?? ''
  const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '100'), 500)
  const offset = parseInt(url.searchParams.get('offset') ?? '0')

  const service = createServiceSupabase()

  let query = service
    .from('user_activity_logs')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (action) query = query.eq('action', action)
  if (user_id) query = query.eq('user_id', user_id)

  const { data: logs, count, error } = await query
  if (error) return NextResponse.json({ message: error.message }, { status: 500 })

  // Manual join with profiles
  const userIds = [...new Set((logs ?? []).map((l: { user_id: string | null }) => l.user_id).filter(Boolean))]
  let profileMap: Record<string, string> = {}
  if (userIds.length > 0) {
    const { data: profiles } = await service
      .from('profiles')
      .select('id, display_name')
      .in('id', userIds)
    profileMap = Object.fromEntries((profiles ?? []).map((p: { id: string; display_name: string }) => [p.id, p.display_name]))
  }

  const enriched = (logs ?? []).map((l: { user_id: string | null }) => ({
    ...l,
    profiles: l.user_id ? { display_name: profileMap[l.user_id] ?? null } : null,
  }))

  return NextResponse.json({ logs: enriched, total: count ?? 0 })
}

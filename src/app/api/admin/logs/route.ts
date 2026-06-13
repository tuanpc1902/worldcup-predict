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
    .select('*, profiles!user_activity_logs_user_id_fkey(display_name)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (action) query = query.eq('action', action)
  if (user_id) query = query.eq('user_id', user_id)

  const { data, count, error } = await query
  if (error) return NextResponse.json({ message: error.message }, { status: 500 })

  return NextResponse.json({ logs: data ?? [], total: count ?? 0 })
}

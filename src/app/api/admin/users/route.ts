import { NextRequest, NextResponse } from 'next/server'
import { createServiceSupabase, createServerSupabase } from '@/lib/supabase-server'

async function verifyAdmin() {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
  return profile?.role === 'admin' ? user : null
}

// GET /api/admin/users?domain=wc.88  — list users with that email domain
export async function GET(req: NextRequest) {
  if (!await verifyAdmin()) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

  const domain = req.nextUrl.searchParams.get('domain') ?? 'wc.88'
  const service = createServiceSupabase()

  // List all auth users (up to 1000)
  const { data: { users }, error } = await service.auth.admin.listUsers({ perPage: 1000 })
  if (error) return NextResponse.json({ message: error.message }, { status: 500 })

  const filtered = users
    .filter(u => u.email?.endsWith(`@${domain}`))
    .map(u => ({
      id: u.id,
      email: u.email,
      display_name: u.user_metadata?.full_name ?? u.email?.split('@')[0],
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at,
    }))

  // Merge with profiles for points
  const ids = filtered.map(u => u.id)
  const { data: profiles } = await service
    .from('profiles')
    .select('id, display_name, total_points')
    .in('id', ids)

  const profileMap = new Map((profiles ?? []).map((p: { id: string; display_name: string; total_points: number }) => [p.id, p]))

  const result = filtered.map(u => ({
    ...u,
    display_name: profileMap.get(u.id)?.display_name ?? u.display_name,
    total_points: profileMap.get(u.id)?.total_points ?? 0,
  }))

  return NextResponse.json({ users: result })
}

// PATCH /api/admin/users  — reset password
export async function PATCH(req: NextRequest) {
  if (!await verifyAdmin()) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

  const { user_id, new_password } = await req.json()
  if (!user_id || !new_password) return NextResponse.json({ message: 'user_id and new_password required' }, { status: 400 })

  const service = createServiceSupabase()
  const { error } = await service.auth.admin.updateUserById(user_id, { password: new_password })
  if (error) return NextResponse.json({ message: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}

// DELETE /api/admin/users  — delete user
export async function DELETE(req: NextRequest) {
  if (!await verifyAdmin()) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

  const { user_id } = await req.json()
  if (!user_id) return NextResponse.json({ message: 'user_id required' }, { status: 400 })

  const service = createServiceSupabase()
  const { error } = await service.auth.admin.deleteUser(user_id)
  if (error) return NextResponse.json({ message: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}

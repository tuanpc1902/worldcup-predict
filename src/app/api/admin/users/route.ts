import { NextRequest, NextResponse } from 'next/server'
import { createServiceSupabase, createServerSupabase } from '@/lib/supabase-server'

async function verifyAdmin() {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
  return profile?.role === 'admin' ? user : null
}

// GET /api/admin/users?type=all|wc|google
export async function GET(req: NextRequest) {
  if (!await verifyAdmin()) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

  const type = req.nextUrl.searchParams.get('type') ?? 'all'
  const service = createServiceSupabase()

  const { data: { users }, error } = await service.auth.admin.listUsers({ perPage: 1000 })
  if (error) return NextResponse.json({ message: error.message }, { status: 500 })

  const mapped = users.map(u => {
    const identities = u.identities ?? []
    const isGoogle = identities.some(i => i.provider === 'google')
    const isWc = !isGoogle && u.email?.includes('@wc.')
    return {
      id: u.id,
      email: u.email ?? '',
      display_name: u.user_metadata?.full_name ?? u.email?.split('@')[0] ?? '',
      provider: isGoogle ? 'google' : 'email',
      is_wc: isWc,
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at ?? null,
      total_points: 0,
    }
  })

  const filtered = type === 'google'
    ? mapped.filter(u => u.provider === 'google')
    : type === 'wc'
    ? mapped.filter(u => u.is_wc)
    : mapped

  // Merge with profiles
  const ids = filtered.map(u => u.id)
  if (ids.length > 0) {
    const { data: profiles } = await service
      .from('profiles')
      .select('id, display_name, total_points, role')
      .in('id', ids)

    const profileMap = new Map((profiles ?? []).map(
      (p: { id: string; display_name: string; total_points: number; role: string }) => [p.id, p]
    ))

    filtered.forEach(u => {
      const p = profileMap.get(u.id)
      if (p) {
        u.display_name = p.display_name ?? u.display_name
        u.total_points = p.total_points ?? 0
      }
    })
  }

  return NextResponse.json({ users: filtered, total: mapped.length })
}

// PATCH /api/admin/users — reset password OR update display_name
export async function PATCH(req: NextRequest) {
  if (!await verifyAdmin()) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { user_id, new_password, display_name } = body
  if (!user_id) return NextResponse.json({ message: 'user_id required' }, { status: 400 })

  const service = createServiceSupabase()

  if (display_name !== undefined) {
    const { error } = await service.from('profiles').update({ display_name }).eq('id', user_id)
    if (error) return NextResponse.json({ message: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  if (new_password) {
    const { error } = await service.auth.admin.updateUserById(user_id, { password: new_password })
    if (error) return NextResponse.json({ message: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ message: 'Nothing to update' }, { status: 400 })
}

// DELETE /api/admin/users — delete user
export async function DELETE(req: NextRequest) {
  if (!await verifyAdmin()) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

  const { user_id } = await req.json()
  if (!user_id) return NextResponse.json({ message: 'user_id required' }, { status: 400 })

  const service = createServiceSupabase()
  const { error } = await service.auth.admin.deleteUser(user_id)
  if (error) return NextResponse.json({ message: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}

import { NextRequest, NextResponse } from 'next/server'
import { createServiceSupabase, createServerSupabase } from '@/lib/supabase-server'

async function verifyAdmin() {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const svc = createServiceSupabase()
  const { data } = await svc.from('profiles').select('role').eq('id', user.id).maybeSingle()
  return data?.role === 'admin' ? user : null
}

// GET /api/admin/config — returns all rows (public read, no auth needed)
export async function GET() {
  const supabase = createServiceSupabase()
  const { data, error } = await supabase
    .from('system_config')
    .select('key, value, label, description, updated_at')
    .order('key')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// PATCH /api/admin/config — { key, value: boolean }
export async function PATCH(req: NextRequest) {
  if (!await verifyAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { key, value } = await req.json()
  if (!key || typeof value !== 'boolean') {
    return NextResponse.json({ error: 'key (string) và value (boolean) là bắt buộc' }, { status: 400 })
  }

  const supabase = createServiceSupabase()
  const { error } = await supabase
    .from('system_config')
    .update({ value: String(value), updated_at: new Date().toISOString() })
    .eq('key', key)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, key, value })
}

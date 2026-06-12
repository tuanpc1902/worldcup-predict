import { NextRequest, NextResponse } from 'next/server'
import { createServiceSupabase } from '@/lib/supabase-server'

export async function GET(req: NextRequest) {
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    req.headers.get('x-real-ip') ||
    '0.0.0.0'

  // Localhost/dev: skip IP check
  if (ip === '0.0.0.0' || ip === '127.0.0.1' || ip === '::1') {
    return NextResponse.json({ ok: true })
  }

  const supabase = createServiceSupabase()
  const { data: existing } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('ip_address', ip)
    .maybeSingle()

  if (existing) {
    return NextResponse.json(
      { message: `IP này đã có tài khoản "${existing.display_name}". Mỗi địa chỉ IP chỉ được tạo 1 tài khoản.` },
      { status: 409 }
    )
  }

  return NextResponse.json({ ok: true })
}

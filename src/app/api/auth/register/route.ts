import { NextRequest, NextResponse } from 'next/server'
import { createServiceSupabase } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  const { email, password, name } = await req.json()

  if (!email || !password || !name) {
    return NextResponse.json({ message: 'Thiếu thông tin đăng ký' }, { status: 400 })
  }

  // Get real IP (Vercel sets x-forwarded-for)
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    req.headers.get('x-real-ip') ||
    '0.0.0.0'

  const supabase = createServiceSupabase()

  // Check if this IP already has an account
  const { data: existing } = await supabase
    .from('profiles')
    .select('id, display_name')
    .eq('ip_address', ip)
    .maybeSingle()

  if (existing) {
    return NextResponse.json(
      { message: `IP này đã có tài khoản "${existing.display_name}". Mỗi địa chỉ IP chỉ được tạo 1 tài khoản.` },
      { status: 409 }
    )
  }

  // Create auth user
  const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
    email,
    password,
    user_metadata: { full_name: name },
    email_confirm: true,
  })

  if (authErr || !authData?.user) {
    console.error('[register] createUser error:', authErr)
    return NextResponse.json(
      { message: authErr?.message ?? 'Không thể tạo tài khoản', debug: authErr },
      { status: 400 }
    )
  }

  // Save IP to profile (trigger already created the profile row)
  await supabase
    .from('profiles')
    .update({ ip_address: ip })
    .eq('id', authData.user.id)

  return NextResponse.json({ message: 'Tạo tài khoản thành công' })
}

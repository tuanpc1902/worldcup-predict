import { NextRequest, NextResponse } from 'next/server'
import { createServiceSupabase } from '@/lib/supabase-server'

function getIP(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    '127.0.0.1'
  )
}

const LOCALHOST = new Set(['127.0.0.1', '::1', '0.0.0.0'])

export async function POST(req: NextRequest) {
  const { email, password, name, device_id } = await req.json()

  if (!email || !password || !name) {
    return NextResponse.json({ message: 'Thiếu thông tin đăng ký' }, { status: 400 })
  }

  const ip = getIP(req)
  const isLocal = LOCALHOST.has(ip)
  const ipLimit = parseInt(process.env.REGISTER_IP_LIMIT ?? '10', 10)
  const supabase = createServiceSupabase()

  // 1. Device fingerprint check — hard limit: 1 account per device
  if (device_id) {
    const { data: deviceRows } = await supabase
      .from('registration_logs')
      .select('id')
      .eq('device_id', device_id)
      .limit(1)

    if (deviceRows && deviceRows.length > 0) {
      return NextResponse.json(
        { message: 'Thiết bị này đã được dùng để tạo tài khoản. Vui lòng đăng nhập.' },
        { status: 403 }
      )
    }
  }

  // 2. IP check — soft limit, generous for shared org networks
  if (!isLocal) {
    const { count } = await supabase
      .from('registration_logs')
      .select('id', { count: 'exact', head: true })
      .eq('ip_address', ip)

    if ((count ?? 0) >= ipLimit) {
      return NextResponse.json(
        {
          message: `Đã đạt giới hạn tài khoản từ địa chỉ mạng này (${ipLimit} tài khoản). Liên hệ admin để được hỗ trợ.`,
        },
        { status: 429 }
      )
    }
  }

  // 3. Create auth user (admin API — bypasses email confirmation)
  const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
    email,
    password,
    user_metadata: { full_name: name },
    email_confirm: true,
  })

  if (authErr || !authData?.user) {
    return NextResponse.json(
      { message: authErr?.message ?? 'Không thể tạo tài khoản' },
      { status: 400 }
    )
  }

  const userId = authData.user.id

  // 4. Save IP to profile row (created by DB trigger)
  if (!isLocal) {
    await supabase.from('profiles').update({ ip_address: ip }).eq('id', userId)
  }

  // 5. Log registration for future limit checks
  await supabase.from('registration_logs').insert({
    user_id: userId,
    ip_address: isLocal ? null : ip,
    device_id: device_id ?? null,
  })

  return NextResponse.json({ message: 'Tạo tài khoản thành công' })
}

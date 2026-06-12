import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'
import { createServiceSupabase } from '@/lib/supabase-server'

export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url)
  const code = searchParams.get('code')

  if (code) {
    const supabase = await createServerSupabase()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.user) {
      // Lưu IP sau khi xác nhận email hoặc Google login
      const ip =
        req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
        req.headers.get('x-real-ip') ||
        null

      if (ip && ip !== '127.0.0.1' && ip !== '::1') {
        const service = createServiceSupabase()
        // Chỉ set IP nếu chưa có
        await service
          .from('profiles')
          .update({ ip_address: ip })
          .eq('id', data.user.id)
          .is('ip_address', null)
      }
    }
  }

  return NextResponse.redirect(`${origin}/`)
}

import { NextRequest, NextResponse } from 'next/server'
import { createServiceSupabase, createServerSupabase } from '@/lib/supabase-server'

function parseUA(ua: string) {
  const isMobile = /mobile|android|iphone|ipad|ipod/i.test(ua)
  const isTablet = /ipad|tablet/i.test(ua)

  let os = 'Unknown'
  if (/windows/i.test(ua)) os = 'Windows'
  else if (/macintosh|mac os/i.test(ua)) os = 'macOS'
  else if (/iphone|ipad|ipod/i.test(ua)) os = 'iOS'
  else if (/android/i.test(ua)) os = 'Android'
  else if (/linux/i.test(ua)) os = 'Linux'

  let browser = 'Unknown'
  if (/edg\//i.test(ua)) browser = 'Edge'
  else if (/chrome\//i.test(ua) && !/chromium/i.test(ua)) browser = 'Chrome'
  else if (/firefox\//i.test(ua)) browser = 'Firefox'
  else if (/safari\//i.test(ua) && !/chrome/i.test(ua)) browser = 'Safari'
  else if (/opr\//i.test(ua)) browser = 'Opera'

  const device_type = isTablet ? 'tablet' : isMobile ? 'mobile' : 'desktop'
  return { os, browser, device_type }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action, page, detail, session_id } = body

    if (!action) return NextResponse.json({ ok: false }, { status: 400 })

    // Try to get current user (optional — anonymous logs allowed)
    let user_id: string | null = null
    try {
      const supabase = await createServerSupabase()
      const { data: { user } } = await supabase.auth.getUser()
      user_id = user?.id ?? null
    } catch { /* anonymous */ }

    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      req.headers.get('x-real-ip') ||
      null

    const ua = req.headers.get('user-agent') ?? ''
    const referer = req.headers.get('referer') ?? null
    const { os, browser, device_type } = parseUA(ua)

    const service = createServiceSupabase()
    await service.from('user_activity_logs').insert({
      user_id,
      session_id: session_id ?? null,
      action,
      page: page ?? null,
      detail: detail ?? {},
      ip,
      user_agent: ua || null,
      device_type,
      os,
      browser,
      referer,
    })

    return NextResponse.json({ ok: true })
  } catch (e) {
    // Never fail the caller for a log error
    console.error('[log]', e)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}

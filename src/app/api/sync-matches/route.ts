import { NextRequest, NextResponse } from 'next/server'
import { createServiceSupabase } from '@/lib/supabase-server'
import { fetchFixtures, mapFixturesToMatches } from '@/lib/football-api'

export async function POST(req: NextRequest) {
  // Vercel Cron gửi header Authorization: Bearer <CRON_SECRET>
  // Admin gọi tay từ /admin không cần secret
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    const isAdmin = await checkAdmin(req)
    if (!isAdmin) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }
  }

  try {
    const data = await fetchFixtures()
    const matches = mapFixturesToMatches(data)

    if (matches.length === 0) {
      return NextResponse.json({ message: 'Không có trận nào trong dữ liệu' }, { status: 400 })
    }

    const supabase = createServiceSupabase()
    let upserted = 0
    let scored = 0

    for (const match of matches) {
      const { data: existing } = await supabase
        .from('matches')
        .select('id, status')
        .eq('home_team', match.home_team)
        .eq('away_team', match.away_team)
        .eq('match_time', match.match_time)
        .maybeSingle()

      if (existing) {
        await supabase.from('matches').update({
          home_score: match.home_score,
          away_score: match.away_score,
          status: match.status,
          api_synced_at: new Date().toISOString(),
        }).eq('id', existing.id)

        // Tự động chấm điểm nếu vừa có kết quả
        if (match.status === 'finished' && existing.status !== 'finished') {
          const { error } = await supabase.rpc('score_match', { p_match_id: existing.id })
          if (!error) scored++
        }
      } else {
        await supabase.from('matches').insert({
          ...match,
          api_synced_at: new Date().toISOString(),
        })
      }
      upserted++
    }

    return NextResponse.json({
      message: `Sync ${upserted} trận, chấm điểm ${scored} trận mới hoàn thành`,
    })
  } catch (err: any) {
    return NextResponse.json({ message: err.message }, { status: 500 })
  }
}

async function checkAdmin(req: NextRequest): Promise<boolean> {
  try {
    const { createServerSupabase } = await import('@/lib/supabase-server')
    const supabase = await createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false
    const { data } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
    return data?.role === 'admin'
  } catch {
    return false
  }
}

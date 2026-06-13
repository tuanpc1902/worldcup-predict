import { NextRequest, NextResponse } from 'next/server'
import { createServiceSupabase } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  const { match_id } = await req.json()
  if (!match_id) return NextResponse.json({ error: 'match_id required' }, { status: 400 })

  const supabase = createServiceSupabase()

  // Guard: only score finished matches
  const { data: match } = await supabase
    .from('matches')
    .select('status, home_score, away_score, home_team, away_team')
    .eq('id', match_id)
    .maybeSingle()

  if (!match) return NextResponse.json({ error: 'Không tìm thấy trận đấu' }, { status: 404 })

  if (match.status !== 'finished') {
    return NextResponse.json(
      { error: `Trận đấu đang "${match.status}" — chỉ chấm điểm khi trận kết thúc (finished)` },
      { status: 422 }
    )
  }

  if (match.home_score === null || match.away_score === null) {
    return NextResponse.json(
      { error: 'Chưa có tỉ số — nhập kết quả trước khi chấm điểm' },
      { status: 422 }
    )
  }

  const { error } = await supabase.rpc('score_match', { p_match_id: match_id })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

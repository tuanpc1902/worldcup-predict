import { NextRequest, NextResponse } from 'next/server'
import { createServiceSupabase } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  const { match_id } = await req.json()
  if (!match_id) return NextResponse.json({ error: 'match_id required' }, { status: 400 })

  const supabase = createServiceSupabase()
  const { error } = await supabase.rpc('score_match', { p_match_id: match_id })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

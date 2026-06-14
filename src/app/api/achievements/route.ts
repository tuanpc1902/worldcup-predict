import { NextRequest, NextResponse } from 'next/server'
import { createServiceSupabase } from '@/lib/supabase-server'

// Award achievements for a user based on their stats
export async function POST(req: NextRequest) {
  const { user_id } = await req.json()
  if (!user_id) return NextResponse.json({ error: 'user_id required' }, { status: 400 })

  const supabase = createServiceSupabase()

  const [
    { data: profile },
    { data: predictions },
    { data: existingAwards },
    { data: rankRow },
    { data: champion },
    { data: groupMembership },
  ] = await Promise.all([
    supabase.from('profiles').select('total_points').eq('id', user_id).maybeSingle(),
    supabase.from('predictions').select('points_earned, predicted_home, predicted_away').eq('user_id', user_id).not('points_earned', 'is', null),
    supabase.from('user_achievements').select('achievement_id').eq('user_id', user_id),
    supabase.from('leaderboard').select('rank').eq('id', user_id).maybeSingle(),
    supabase.from('champion_picks').select('points_earned').eq('user_id', user_id).maybeSingle(),
    supabase.from('group_members').select('group_id').eq('user_id', user_id).eq('status', 'approved').limit(1),
  ])

  if (!profile) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const owned = new Set((existingAwards ?? []).map((a: { achievement_id: string }) => a.achievement_id))
  const toAward: string[] = []

  const realPreds = (predictions ?? []).filter((p: { predicted_home: number; predicted_away: number; points_earned: number | null }) =>
    !(p.predicted_home === -1 && p.predicted_away === -1)
  )
  const exactCount = realPreds.filter((p: { points_earned: number | null }) => (p.points_earned ?? 0) >= 5).length
  const totalCount = realPreds.length

  // Streak calculation
  let curStreak = 0, maxStreak = 0
  for (const p of realPreds) {
    if ((p.points_earned ?? 0) > 0) { curStreak++; maxStreak = Math.max(maxStreak, curStreak) }
    else curStreak = 0
  }

  const rank = rankRow?.rank ?? 999

  const check = (id: string, condition: boolean) => { if (condition && !owned.has(id)) toAward.push(id) }

  check('first_prediction', totalCount >= 1)
  check('first_exact', exactCount >= 1)
  check('hot_streak_3', maxStreak >= 3)
  check('hot_streak_5', maxStreak >= 5)
  check('top3_leaderboard', rank <= 3)
  check('predict_10', totalCount >= 10)
  check('predict_30', totalCount >= 30)
  check('exact_5', exactCount >= 5)
  check('champion_correct', (champion?.points_earned ?? 0) > 0)
  check('group_top', (groupMembership ?? []).length > 0)

  if (toAward.length > 0) {
    await supabase.from('user_achievements').insert(
      toAward.map(achievement_id => ({ user_id, achievement_id }))
    )
  }

  return NextResponse.json({ awarded: toAward })
}

import { createServiceSupabase } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import MatchDetailClient from './MatchDetailClient'

export const dynamic = 'force-dynamic'

export default async function MatchDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createServiceSupabase()

  const [{ data: match }, { data: predictions }, { data: comments }] = await Promise.all([
    supabase.from('matches').select('*').eq('id', id).single(),
    supabase.from('predictions')
      .select('predicted_home, predicted_away, points_earned, user_id, profiles(display_name, avatar_url)')
      .eq('match_id', id),
    supabase.from('match_comments')
      .select('id, content, created_at, reactions, user_id, profiles(display_name, avatar_url)')
      .eq('match_id', id)
      .order('created_at', { ascending: true }),
  ])

  if (!match) notFound()

  // Thống kê dự đoán
  const stats = buildPredictionStats(predictions ?? [])

  return <MatchDetailClient match={match} stats={stats} comments={comments ?? []} />
}

function buildPredictionStats(predictions: any[]) {
  const total = predictions.length
  if (total === 0) return { total: 0, homeWin: 0, draw: 0, awayWin: 0, topScores: [] }

  let homeWin = 0, draw = 0, awayWin = 0
  const scoreCount: Record<string, number> = {}

  for (const p of predictions) {
    const h = p.predicted_home, a = p.predicted_away
    if (h > a) homeWin++
    else if (h === a) draw++
    else awayWin++
    const key = `${h}-${a}`
    scoreCount[key] = (scoreCount[key] ?? 0) + 1
  }

  const topScores = Object.entries(scoreCount)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([score, count]) => ({ score, count, pct: Math.round((count / total) * 100) }))

  return {
    total,
    homeWin: Math.round((homeWin / total) * 100),
    draw: Math.round((draw / total) * 100),
    awayWin: Math.round((awayWin / total) * 100),
    topScores,
  }
}

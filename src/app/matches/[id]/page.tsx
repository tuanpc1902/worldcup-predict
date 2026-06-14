import { createServiceSupabase } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import MatchDetailClient from './MatchDetailClient'
import type { Match, Comment, PredictionStats, MatchGoal } from '@/types'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const supabase = createServiceSupabase()
  const { data: match } = await supabase.from('matches').select('home_team, away_team, home_score, away_score, status').eq('id', id).maybeSingle()
  if (!match) return {}

  const hasScore = match.status === 'finished' && match.home_score !== null
  const title = `${match.home_team} vs ${match.away_team}${hasScore ? ` | ${match.home_score}–${match.away_score}` : ''} · WC-88`
  const ogUrl = `/api/og?home=${encodeURIComponent(match.home_team)}&away=${encodeURIComponent(match.away_team)}` +
    (hasScore ? `&hs=${match.home_score}&as=${match.away_score}` : '')

  return {
    title,
    openGraph: { title, images: [{ url: ogUrl, width: 1200, height: 630 }] },
    twitter: { card: 'summary_large_image', title, images: [ogUrl] },
  }
}

interface RawPrediction {
  predicted_home: number
  predicted_away: number
  points_earned: number | null
  user_id: string
}

interface RawComment {
  id: string
  content: string
  created_at: string
  reactions: Record<string, number>
  user_id: string
  profiles: { display_name: string; avatar_url: string | null } | { display_name: string; avatar_url: string | null }[]
}

export default async function MatchDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createServiceSupabase()

  const [{ data: match }, { data: predictions }, { data: comments }, { data: goals }] = await Promise.all([
    supabase.from('matches').select('*').eq('id', id).single(),
    supabase.from('predictions')
      .select('predicted_home, predicted_away, points_earned, user_id, profiles(display_name, avatar_url)')
      .eq('match_id', id),
    supabase.from('match_comments')
      .select('id, content, created_at, reactions, user_id, profiles(display_name, avatar_url)')
      .eq('match_id', id)
      .order('created_at', { ascending: true }),
    supabase.from('match_goals')
      .select('*')
      .eq('match_id', id)
      .order('minute', { ascending: true }),
  ])

  if (!match) notFound()

  const stats = buildPredictionStats((predictions ?? []) as RawPrediction[])

  const flatComments: Comment[] = ((comments ?? []) as RawComment[]).map(c => ({
    ...c,
    match_id: id,
    profiles: Array.isArray(c.profiles) ? c.profiles[0] : c.profiles,
  }))

  return (
    <MatchDetailClient
      match={match as Match}
      stats={stats}
      comments={flatComments}
      goals={(goals ?? []) as MatchGoal[]}
    />
  )
}

function buildPredictionStats(predictions: RawPrediction[]): PredictionStats {
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

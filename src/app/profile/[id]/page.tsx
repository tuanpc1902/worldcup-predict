import { createServiceSupabase } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import ProfileClient from './ProfileClient'

export const dynamic = 'force-dynamic'

export default async function ProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createServiceSupabase()

  const [{ data: profile }, { data: predictions }, { data: rank }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', id).single(),
    supabase.from('predictions')
      .select('*, matches(home_team, away_team, home_flag, away_flag, match_time, home_score, away_score, status, stage, group_name)')
      .eq('user_id', id)
      .order('created_at', { ascending: false }),
    supabase.from('leaderboard').select('rank').eq('id', id).maybeSingle(),
  ])

  if (!profile) notFound()

  return <ProfileClient profile={profile} predictions={(predictions ?? []) as any[]} rank={rank?.rank ?? null} />
}

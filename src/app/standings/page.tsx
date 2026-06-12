import { createServerSupabase } from '@/lib/supabase-server'
import StandingsClient from './StandingsClient'
import type { Match } from '@/types'

export const revalidate = 300

export default async function StandingsPage() {
  const supabase = await createServerSupabase()

  const { data: rawMatches } = await supabase
    .from('matches')
    .select('id,home_team,away_team,home_flag,away_flag,home_score,away_score,status,group_name,stage,match_time')
    .eq('stage', 'group')
    .not('group_name', 'is', null)
    .order('match_time', { ascending: true })

  const matches = (rawMatches ?? []) as Match[]

  return <StandingsClient matches={matches} />
}

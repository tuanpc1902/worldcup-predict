import { createServiceSupabase } from '@/lib/supabase-server'
import { getFlagUrl } from '@/lib/flag-map'
import ChampionClient from './ChampionClient'
import { isPlaceholder } from '@/lib/team-utils'

interface TeamRow { home_team: string; home_flag: string | null }
interface AwayRow { away_team: string; away_flag: string | null }
interface PickRow { team_name: string }

export const dynamic = 'force-dynamic'

export default async function ChampionPage() {
  const supabase = createServiceSupabase()

  const [{ data: homeRows }, { data: awayRows }, { data: picks }] = await Promise.all([
    supabase.from('matches').select('home_team, home_flag'),
    supabase.from('matches').select('away_team, away_flag'),
    supabase.from('champion_picks').select('team_name'),
  ])

  // Build deduped team map — also fill missing flags from local flag-map
  const teamMap = new Map<string, string | null>()

  for (const r of (homeRows ?? []) as TeamRow[]) {
    if (!r.home_team || isPlaceholder(r.home_team)) continue
    const flag = r.home_flag ?? getFlagUrl(r.home_team)
    if (!teamMap.has(r.home_team) || (!teamMap.get(r.home_team) && flag)) {
      teamMap.set(r.home_team, flag)
    }
  }
  for (const r of (awayRows ?? []) as AwayRow[]) {
    if (!r.away_team || isPlaceholder(r.away_team)) continue
    const flag = r.away_flag ?? getFlagUrl(r.away_team)
    if (!teamMap.has(r.away_team) || (!teamMap.get(r.away_team) && flag)) {
      teamMap.set(r.away_team, flag)
    }
  }

  const teams = Array.from(teamMap.entries())
    .map(([name, flag]) => ({ name, flag }))
    .sort((a, b) => a.name.localeCompare(b.name))

  const pickCount: Record<string, number> = {}
  for (const p of (picks ?? []) as PickRow[]) {
    pickCount[p.team_name] = (pickCount[p.team_name] ?? 0) + 1
  }

  return <ChampionClient teams={teams} pickCount={pickCount} />
}

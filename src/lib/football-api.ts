const JSON_URL = 'https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json'

export async function fetchFixtures() {
  const res = await fetch(JSON_URL, { cache: 'no-store' })
  if (!res.ok) throw new Error(`GitHub fetch failed: ${res.status}`)
  return res.json()
}

export function mapFixturesToMatches(data: any): any[] {
  return (data.matches ?? []).map((m: any) => {
    const hasScore = m.score?.ft != null
    const homScore: number | null = hasScore ? m.score.ft[0] : null
    const awayScore: number | null = hasScore ? m.score.ft[1] : null

    return {
      home_team: m.team1 ?? '',
      away_team: m.team2 ?? '',
      home_flag: null,
      away_flag: null,
      match_time: `${m.date}T${m.time ?? '12:00:00'}+00:00`,
      stage: mapRound(m.round ?? ''),
      group_name: m.group ? `Group ${m.group}` : null,
      venue: m.ground ?? null,
      status: hasScore ? 'finished' : 'scheduled',
      home_score: homScore,
      away_score: awayScore,
      api_fixture_id: null,
    }
  })
}

function mapRound(round: string): string {
  const r = round.toLowerCase()
  if (r.includes('matchday') || r.includes('group')) return 'group'
  if (r.includes('round of 32')) return 'round_of_32'
  if (r.includes('round of 16')) return 'round_of_16'
  if (r.includes('quarter')) return 'quarter'
  if (r.includes('semi')) return 'semi'
  if (r.includes('final')) return 'final'
  return 'group'
}

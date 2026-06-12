const RAW_BASE = 'https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026'

export async function fetchFixtures() {
  const urls = [
    `${RAW_BASE}/worldcup.json`,
  ]

  for (const url of urls) {
    try {
      const res = await fetch(url, { next: { revalidate: 3600 } })
      if (res.ok) {
        const data = await res.json()
        return data
      }
    } catch {}
  }
  throw new Error('Không thể lấy dữ liệu từ openfootball/worldcup.json')
}

export function mapFixturesToMatches(data: any): any[] {
  const matches: any[] = []

  for (const round of data.rounds ?? []) {
    const stage = mapRound(round.name)
    for (const match of round.matches ?? []) {
      matches.push({
        home_team: match.team1?.name ?? match.team1,
        away_team: match.team2?.name ?? match.team2,
        home_flag: null,
        away_flag: null,
        match_time: `${match.date}T${match.time ?? '00:00:00'}`,
        stage,
        group_name: stage === 'group' ? (round.name ?? null) : null,
        venue: match.stadium?.name ?? null,
        status: 'scheduled',
        home_score: match.score1 ?? null,
        away_score: match.score2 ?? null,
        api_fixture_id: null,
      })
    }
  }

  return matches
}

function mapRound(name: string): string {
  if (!name) return 'group'
  const n = name.toLowerCase()
  if (n.includes('matchday') || n.includes('group') || n.includes('round 1') || n.includes('round 2') || n.includes('round 3')) return 'group'
  if (n.includes('round of 32')) return 'round_of_32'
  if (n.includes('round of 16')) return 'round_of_16'
  if (n.includes('quarter')) return 'quarter'
  if (n.includes('semi')) return 'semi'
  if (n.includes('final')) return 'final'
  return 'group'
}

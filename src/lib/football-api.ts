const JSON_URL = 'https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json'

export async function fetchFixtures() {
  const res = await fetch(JSON_URL, { cache: 'no-store' })
  if (!res.ok) throw new Error(`GitHub fetch failed: ${res.status}`)
  return res.json()
}

export function mapFixturesToMatches(data: any): any[] {
  return (data.matches ?? []).map((m: any) => {
    const hasScore = m.score?.ft != null

    return {
      home_team: m.team1 ?? '',
      away_team: m.team2 ?? '',
      home_flag: null,
      away_flag: null,
      match_time: parseMatchTime(m.date, m.time),
      stage: mapRound(m.round ?? ''),
      group_name: m.group ?? null,
      venue: m.ground ?? null,
      status: hasScore ? 'finished' : 'scheduled',
      home_score: hasScore ? m.score.ft[0] : null,
      away_score: hasScore ? m.score.ft[1] : null,
      api_fixture_id: null,
    }
  })
}

// Parse "2026-06-12" + "15:00 UTC-4" → UTC ISO string
function parseMatchTime(date: string, time?: string): string {
  if (!time) return `${date}T00:00:00Z`

  // Match "15:00 UTC-4" or "15:00 UTC+2"
  const match = time.match(/^(\d{1,2}):(\d{2})\s*UTC([+-]\d+)$/)
  if (!match) return `${date}T00:00:00Z`

  const hours = parseInt(match[1])
  const minutes = parseInt(match[2])
  const offset = parseInt(match[3]) // e.g. -4, -7

  // Convert local time to UTC: UTC = local - offset
  const totalMinutes = hours * 60 + minutes - offset * 60
  const utcDate = new Date(`${date}T00:00:00Z`)
  utcDate.setUTCMinutes(utcDate.getUTCMinutes() + totalMinutes)

  return utcDate.toISOString()
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

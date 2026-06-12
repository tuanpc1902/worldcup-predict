const BASE = 'https://v3.football.api-sports.io'
const LEAGUE_ID = 1
const SEASON = 2026

async function apiFetch(path: string) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'x-apisports-key': process.env.FOOTBALL_API_KEY! },
    next: { revalidate: 300 },
  })
  if (!res.ok) throw new Error(`API Football error: ${res.status}`)
  return res.json()
}

export async function fetchFixtures() {
  const data = await apiFetch(`/fixtures?league=${LEAGUE_ID}&season=${SEASON}`)
  return data.response as any[]
}

export async function fetchLiveFixtures() {
  const data = await apiFetch(`/fixtures?league=${LEAGUE_ID}&live=all`)
  return data.response as any[]
}

export function mapFixtureToMatch(f: any) {
  return {
    api_fixture_id: f.fixture.id,
    home_team: f.teams.home.name,
    away_team: f.teams.away.name,
    home_flag: f.teams.home.logo,
    away_flag: f.teams.away.logo,
    match_time: f.fixture.date,
    venue: f.fixture.venue?.name ?? null,
    stage: mapRound(f.league.round),
    group_name: f.league.round.startsWith('Group') ? f.league.round : null,
    status: mapStatus(f.fixture.status.short),
    home_score: f.goals.home,
    away_score: f.goals.away,
  }
}

function mapStatus(s: string): string {
  if (['1H', '2H', 'ET', 'P', 'HT', 'LIVE'].includes(s)) return 'live'
  if (['FT', 'AET', 'PEN'].includes(s)) return 'finished'
  if (['CANC', 'ABD', 'AWD', 'WO'].includes(s)) return 'cancelled'
  return 'scheduled'
}

function mapRound(round: string): string {
  if (round.includes('Group')) return 'group'
  if (round.includes('Round of 32')) return 'round_of_32'
  if (round.includes('Round of 16')) return 'round_of_16'
  if (round.includes('Quarter')) return 'quarter'
  if (round.includes('Semi')) return 'semi'
  if (round.includes('Final')) return 'final'
  return 'group'
}

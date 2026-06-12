// Map team name → ISO 3166-1 alpha-2 code for flagcdn.com
// Names match openfootball/worldcup.json team1/team2 values exactly
const FLAG_MAP: Record<string, string> = {
  // Group A
  'Mexico':               'mx',
  'South Africa':         'za',
  'South Korea':          'kr',
  'Czech Republic':       'cz',
  // Group B
  'Canada':               'ca',
  'Bosnia & Herzegovina': 'ba',
  'Qatar':                'qa',
  'Switzerland':          'ch',
  // Group C
  'Brazil':               'br',
  'Morocco':              'ma',
  'Haiti':                'ht',
  'Scotland':             'gb-sct',
  // Group D
  'USA':                  'us',
  'United States':        'us',
  'Paraguay':             'py',
  'Australia':            'au',
  'Turkey':               'tr',
  'Türkiye':              'tr',
  // Group E
  'Germany':              'de',
  'Japan':                'jp',
  'England':              'gb-eng',
  'Colombia':             'co',
  // Group F
  'Spain':                'es',
  'Iran':                 'ir',
  'IR Iran':              'ir',
  'Portugal':             'pt',
  'Nigeria':              'ng',
  // Group G
  'France':               'fr',
  'Saudi Arabia':         'sa',
  'Argentina':            'ar',
  'Kenya':                'ke',
  // Group H
  'Netherlands':          'nl',
  'Senegal':              'sn',
  'Uruguay':              'uy',
  'Ivory Coast':          'ci',
  "Côte d'Ivoire":        'ci',
  // Group I
  'Belgium':              'be',
  'Egypt':                'eg',
  'Croatia':              'hr',
  'New Zealand':          'nz',
  // Group J
  'Italy':                'it',
  'Ecuador':              'ec',
  'Chile':                'cl',
  'Venezuela':            've',
  // Group K
  'Denmark':              'dk',
  'Ghana':                'gh',
  'Serbia':               'rs',
  'Slovenia':             'si',
  // Group L
  'Poland':               'pl',
  'Guatemala':            'gt',
  'Austria':              'at',
  'Cameroon':             'cm',
  // Remaining WC 2026 confirmed teams (from actual openfootball data)
  'Algeria':              'dz',
  'Cape Verde':           'cv',
  'Curaçao':              'cw',
  'Curacao':              'cw',
  'DR Congo':             'cd',
  'Iraq':                 'iq',
  'Ivory Coast':          'ci',
  'Jordan':               'jo',
  'Norway':               'no',
  'Panama':               'pa',
  'Sweden':               'se',
  'Tunisia':              'tn',
  'Uzbekistan':           'uz',
  // Common name variants
  'Honduras':             'hn',
  'Jamaica':              'jm',
  'Costa Rica':           'cr',
  'Trinidad & Tobago':    'tt',
  'El Salvador':          'sv',
  'Peru':                 'pe',
  'Bolivia':              'bo',
  'Mali':                 'ml',
  'Angola':               'ao',
  'Indonesia':            'id',
  'China':                'cn',
  'China PR':             'cn',
  'Korea Republic':       'kr',
  'Greece':               'gr',
  'Hungary':              'hu',
  'Romania':              'ro',
  'Slovakia':             'sk',
  'Ukraine':              'ua',
  'Wales':                'gb-wls',
  'Türkiye':              'tr',
  'IR Iran':              'ir',
  'United States':        'us',
}

export function getFlagUrl(teamName: string, size: 40 | 80 = 40): string | null {
  const code = FLAG_MAP[teamName] ?? FLAG_MAP[teamName?.trim()]
  if (!code) return null
  return `https://flagcdn.com/w${size}/${code}.png`
}

/** All distinct team names in the flag map (deduped) */
export function getAllTeams(): string[] {
  return [...new Set(Object.keys(FLAG_MAP))]
}

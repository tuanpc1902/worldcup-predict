// Map team name → ISO 3166-1 alpha-2 code for flagcdn.com
// Names match openfootball/worldcup.json team1/team2 values
const FLAG_MAP: Record<string, string> = {
  // Group A
  Mexico:                 'mx',
  'South Africa':         'za',
  'South Korea':          'kr',
  'Czech Republic':       'cz',
  // Group B
  Canada:                 'ca',
  'Bosnia & Herzegovina': 'ba',
  Qatar:                  'qa',
  Switzerland:            'ch',
  // Group C
  Brazil:                 'br',
  Morocco:                'ma',
  Haiti:                  'ht',
  Scotland:               'gb-sct',
  // Group D
  USA:                    'us',
  Paraguay:               'py',
  Australia:              'au',
  Turkey:                 'tr',
  // Group E
  Germany:                'de',
  Japan:                  'jp',
  England:                'gb-eng',
  Colombia:               'co',
  // Group F
  Spain:                  'es',
  Iran:                   'ir',
  Portugal:               'pt',
  Nigeria:                'ng',
  // Group G
  France:                 'fr',
  'Saudi Arabia':         'sa',
  Argentina:              'ar',
  Kenya:                  'ke',
  // Group H
  Netherlands:            'nl',
  Senegal:                'sn',
  Uruguay:                'uy',
  'Ivory Coast':          'ci',
  // Group I
  Belgium:                'be',
  Egypt:                  'eg',
  Croatia:                'hr',
  'New Zealand':          'nz',
  // Group J
  Italy:                  'it',
  Ecuador:                'ec',
  Chile:                  'cl',
  Venezuela:              've',
  // Group K
  Denmark:                'dk',
  Ghana:                  'gh',
  Serbia:                 'rs',
  Slovenia:               'si',
  // Group L
  Poland:                 'pl',
  Guatemala:              'gt',
  Austria:                'at',
  Cameroon:               'cm',
  // Additional WC 2026 teams (from actual openfootball data)
  Algeria:                'dz',
  'Cape Verde':           'cv',
  'Curaçao':              'cw',
  'DR Congo':             'cd',
  Iraq:                   'iq',
  Jordan:                 'jo',
  Norway:                 'no',
  Panama:                 'pa',
  Sweden:                 'se',
  Tunisia:                'tn',
  Uzbekistan:             'uz',
  // Name variants openfootball may use
  'United States':        'us',
  'Türkiye':              'tr',
  'IR Iran':              'ir',
  'Korea Republic':       'kr',
  "Côte d'Ivoire":        'ci',
  Curacao:                'cw',
  'China PR':             'cn',
  China:                  'cn',
  Indonesia:              'id',
}

export function getFlagUrl(teamName: string, size: 40 | 80 = 80): string | null {
  const code = FLAG_MAP[teamName] ?? FLAG_MAP[teamName?.trim()]
  if (!code) return null
  // Route through local proxy so browser + CDN cache the image long-term
  return `/api/flag/${code}?w=${size}`
}

export function getAllTeams(): string[] {
  return [...new Set(Object.keys(FLAG_MAP))]
}

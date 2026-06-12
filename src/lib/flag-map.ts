// Map team name → ISO 3166-1 alpha-2 code for flagcdn.com
const FLAG_MAP: Record<string, string> = {
  // Group A
  'Mexico': 'mx',
  'South Africa': 'za',
  'South Korea': 'kr',
  'Czech Republic': 'cz',
  // Group B
  'Canada': 'ca',
  'Bosnia & Herzegovina': 'ba',
  'Qatar': 'qa',
  'Switzerland': 'ch',
  // Group C
  'Brazil': 'br',
  'Morocco': 'ma',
  'Haiti': 'ht',
  'Scotland': 'gb-sct',
  // Group D
  'USA': 'us',
  'United States': 'us',
  'Paraguay': 'py',
  'Australia': 'au',
  'Turkey': 'tr',
  // Group E
  'Germany': 'de',
  'Japan': 'jp',
  'England': 'gb-eng',
  'Colombia': 'co',
  // Group F
  'Spain': 'es',
  'Iran': 'ir',
  'Portugal': 'pt',
  'Nigeria': 'ng',
  // Group G
  'France': 'fr',
  'Saudi Arabia': 'sa',
  'Argentina': 'ar',
  'Kenya': 'ke',
  // Group H
  'Netherlands': 'nl',
  'Senegal': 'sn',
  'Uruguay': 'uy',
  'Ivory Coast': 'ci',
  "Côte d'Ivoire": 'ci',
  // Group I
  'Belgium': 'be',
  'Egypt': 'eg',
  'Croatia': 'hr',
  'New Zealand': 'nz',
  // Group J
  'Italy': 'it',
  'Ecuador': 'ec',
  'Chile': 'cl',
  'Venezuela': 've',
  // Group K
  'Denmark': 'dk',
  'Ghana': 'gh',
  'Mexico (again)': 'mx',
  'Serbia': 'rs',
  // Group L
  'Poland': 'pl',
  'Guatemala': 'gt',
  'Austria': 'at',
  'Cameroon': 'cm',
  // Additional teams
  'Algeria': 'dz',
  'Angola': 'ao',
  'DR Congo': 'cd',
  'Mali': 'ml',
  'Tunisia': 'tn',
  'Costa Rica': 'cr',
  'Honduras': 'hn',
  'Panama': 'pa',
  'Peru': 'pe',
  'Bolivia': 'bo',
  'Greece': 'gr',
  'Hungary': 'hu',
  'Norway': 'no',
  'Romania': 'ro',
  'Slovakia': 'sk',
  'Slovenia': 'si',
  'Sweden': 'se',
  'Ukraine': 'ua',
  'Wales': 'gb-wls',
  'China': 'cn',
  'India': 'in',
  'Indonesia': 'id',
  'Iraq': 'iq',
  'Jordan': 'jo',
  'Kuwait': 'kw',
  'Oman': 'om',
  'Palestine': 'ps',
  'Syria': 'sy',
  'Thailand': 'th',
  'Vietnam': 'vn',
  'Jamaica': 'jm',
  'Trinidad & Tobago': 'tt',
  'Cuba': 'cu',
  'El Salvador': 'sv',
  'Nicaragua': 'ni',
  'New Caledonia': 'nc',
  'Fiji': 'fj',
  'Papua New Guinea': 'pg',
  'Tahiti': 'pf',
}

export function getFlagUrl(teamName: string, size: 40 | 80 = 40): string | null {
  const code = FLAG_MAP[teamName] ?? FLAG_MAP[teamName.trim()]
  if (!code) return null
  return `https://flagcdn.com/w${size}/${code}.png`
}

export function getAllTeams(): string[] {
  return Object.keys(FLAG_MAP)
}

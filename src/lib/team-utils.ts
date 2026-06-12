/**
 * Returns true for openfootball knockout-round placeholder team names:
 *   "1A", "2B"          — group position (e.g. winner of group A)
 *   "W49", "L50"        — winner/loser of match #N
 *   "3E/F/G/I/J"        — best 3rd-place from specified groups
 */
export function isPlaceholder(name: string): boolean {
  if (!name) return true
  // Contains "/" → always a multi-group placeholder like "3E/F/G/I/J"
  if (name.includes('/')) return true
  // Starts with digit + only uppercase letters, no spaces → "1A", "2B", "3C"
  if (/^\d[A-Z]+$/.test(name)) return true
  // W/L followed by digits → "W49", "L50"
  if (/^[WL]\d+$/.test(name)) return true
  return false
}

export interface Tier {
  name: string
  icon: string
  color: string
  bg: string
  border: string
  min: number
}

export const TIERS: Tier[] = [
  { name: 'Platinum', icon: '💎', color: '#0ea5e9', bg: '#e0f2fe', border: '#7dd3fc', min: 150 },
  { name: 'Gold',     icon: '🥇', color: '#d97706', bg: '#fef3c7', border: '#fcd34d', min: 80  },
  { name: 'Silver',   icon: '🥈', color: '#6b7280', bg: '#f3f4f6', border: '#d1d5db', min: 30  },
  { name: 'Bronze',   icon: '🥉', color: '#92400e', bg: '#fef3c7', border: '#d97706', min: 0   },
]

export function getTier(points: number): Tier {
  return TIERS.find(t => points >= t.min) ?? TIERS[TIERS.length - 1]
}

export function getNextTier(points: number): { tier: Tier; remaining: number } | null {
  const idx = TIERS.findIndex(t => points >= t.min)
  if (idx === 0) return null // already Platinum
  const next = TIERS[idx - 1]
  return { tier: next, remaining: next.min - points }
}

import { getTier } from '@/lib/tier'

interface Props {
  points: number
  showName?: boolean
  size?: 'sm' | 'md'
}

export default function TierBadge({ points, showName = false, size = 'sm' }: Props) {
  const tier = getTier(points)
  const px = size === 'md' ? 'px-2.5 py-1' : 'px-1.5 py-0.5'
  const text = size === 'md' ? 'text-xs' : 'text-[10px]'

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-bold ${px} ${text} border`}
      style={{ color: tier.color, background: tier.bg, borderColor: tier.border }}
      title={`${tier.name} (${points} pts)`}
    >
      <span className="leading-none">{tier.icon}</span>
      {showName && <span>{tier.name}</span>}
    </span>
  )
}

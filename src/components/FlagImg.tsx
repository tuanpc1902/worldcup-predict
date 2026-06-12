'use client'
import { useState } from 'react'

type Size = 'xs' | 'sm' | 'md' | 'lg'

const SIZE_CLASS: Record<Size, string> = {
  xs: 'w-5 h-3.5',
  sm: 'w-6 h-4',
  md: 'w-8 h-6',
  lg: 'w-14 h-10',
}

interface Props {
  team: string
  flag: string | null | undefined
  size?: Size
  className?: string
}

export default function FlagImg({ team, flag, size = 'md', className = '' }: Props) {
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState(false)
  const sizeClass = SIZE_CLASS[size]

  if (!flag || error) {
    return (
      <div
        className={`${sizeClass} bg-slate-200 rounded flex-shrink-0 flex items-center justify-center ${className}`}
        title={team}
      >
        <span className="text-[8px] text-slate-400 font-bold leading-none select-none">
          {team.slice(0, 2).toUpperCase()}
        </span>
      </div>
    )
  }

  return (
    <div className={`${sizeClass} relative flex-shrink-0 rounded overflow-hidden ${className}`}>
      {!loaded && (
        <div className={`absolute inset-0 bg-slate-200 animate-pulse rounded`} />
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={flag}
        alt={team}
        className={`${sizeClass} object-cover rounded shadow-sm transition-opacity duration-200 ${
          loaded ? 'opacity-100' : 'opacity-0'
        }`}
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
        draggable={false}
      />
    </div>
  )
}

'use client'
import { useState } from 'react'
import Link from 'next/link'

type Size = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

const SIZE_PX: Record<Size, { w: number; h: number }> = {
  xs: { w: 22, h: 15 },
  sm: { w: 28, h: 19 },
  md: { w: 36, h: 25 },
  lg: { w: 56, h: 39 },
  xl: { w: 80, h: 56 },
}

interface Props {
  team: string
  flag: string | null | undefined
  size?: Size
  className?: string
  href?: string
}

export default function FlagImg({ team, flag, size = 'md', className = '', href }: Props) {
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState(false)
  const { w, h } = SIZE_PX[size]

  // Route flagcdn.com URLs through local proxy for long-term browser/CDN caching.
  // Always use w80 for best quality; w40 stored in DB is upgraded here.
  const flagSrc = flag?.replace(
    /^https:\/\/flagcdn\.com\/w(40|80)\/([a-z0-9-]+)\.png$/,
    (_m, _w, code) => `/api/flag/${code}?w=80`
  ) ?? flag

  const inner = (!flagSrc || error) ? (
    <div
      style={{ width: w, height: h, minWidth: w, minHeight: h }}
      className={`bg-slate-200 rounded flex-shrink-0 flex items-center justify-center ${className}`}
      title={team}
    >
      <span className="text-[8px] text-slate-400 font-bold leading-none select-none">
        {team.slice(0, 2).toUpperCase()}
      </span>
    </div>
  ) : (
    <div
      style={{ width: w, height: h, minWidth: w, minHeight: h }}
      className={`relative flex-shrink-0 rounded overflow-hidden ${className}`}
    >
      {!loaded && (
        <div className="absolute inset-0 bg-slate-200 animate-pulse rounded" />
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={flagSrc}
        alt={team}
        style={{ width: w, height: h, objectFit: 'cover' }}
        className={`rounded shadow-sm transition-opacity duration-200 ${loaded ? 'opacity-100' : 'opacity-0'}`}
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
        draggable={false}
      />
    </div>
  )

  if (href) {
    return (
      <Link href={href} title={team} className="shrink-0 hover:opacity-80 hover:scale-105 transition-all duration-150" onClick={e => e.stopPropagation()}>
        {inner}
      </Link>
    )
  }
  return inner
}

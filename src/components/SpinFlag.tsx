'use client'
import { useEffect, useState } from 'react'

const CODES = [
  'br','fr','de','es','ar','pt','gb-eng','nl','it','us',
  'jp','kr','ma','ng','sn','au','co','uy','hr','be',
  'mx','ca','ch','dk','pl','tr','ir','sa','eg','gh',
  'ba','qa','ht','gb-sct','py','ci','ec','ve','rs','si',
  'at','cm','dz','no','pa','se','tn','id','cn',
]

interface Props {
  /** diameter of the flag circle in px */
  size?: number
}

export default function SpinFlag({ size = 80 }: Props) {
  const [code, setCode] = useState<string | null>(null)

  useEffect(() => {
    setCode(CODES[Math.floor(Math.random() * CODES.length)])
  }, [])

  const ring = size + 12          // outer ring diameter
  const gap  = 4                  // space between ring and flag
  const cdnW = size >= 60 ? 80 : 40

  if (!code) {
    return (
      <div
        className="rounded-full bg-slate-200 animate-pulse"
        style={{ width: ring, height: ring }}
      />
    )
  }

  return (
    <div style={{ position: 'relative', width: ring, height: ring, flexShrink: 0 }}>
      {/* Spinning arc — only the border rotates, flag stays still */}
      <div style={{
        position: 'absolute',
        inset: 0,
        borderRadius: '50%',
        border: `3px solid var(--brand-bg)`,
        borderTopColor: 'var(--brand)',
        borderRightColor: 'var(--brand)',
        animation: 'spin 0.9s linear infinite',
        boxSizing: 'border-box',
      }} />

      {/* Static circular flag */}
      <div style={{
        position: 'absolute',
        inset: gap,
        borderRadius: '50%',
        overflow: 'hidden',
        boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
      }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`https://flagcdn.com/w${cdnW}/${code}.png`}
          alt=""
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      </div>
    </div>
  )
}

'use client'
import { useEffect, useState } from 'react'

// Curated list of recognisable WC 2026 nations
const CODES = [
  'br','fr','de','es','ar','pt','gb-eng','nl','it','us',
  'jp','kr','ma','ng','sn','au','co','uy','hr','be',
  'mx','ca','ch','dk','pl','tr','ir','sa','eg','gh',
  'ba','qa','ht','gb-sct','py','ci','ec','ve','rs','si',
  'at','cm','dz','no','pa','se','tn','id','cn',
]

interface Props {
  /** px diameter of the circular crop */
  size?: number
  /** extra className on the outer wrapper */
  className?: string
}

export default function SpinFlag({ size = 44, className = '' }: Props) {
  const [code, setCode] = useState<string | null>(null)

  useEffect(() => {
    setCode(CODES[Math.floor(Math.random() * CODES.length)])
  }, [])

  const s = size
  const imgW = Math.round(s * 1.6)   // wider than circle so crop looks good
  const imgH = Math.round(s * 1.1)
  const cdnW = imgW >= 60 ? 80 : 40

  if (!code) {
    return (
      <div
        className={`rounded-full bg-slate-200 animate-pulse ${className}`}
        style={{ width: s, height: s }}
      />
    )
  }

  return (
    <div
      className={`rounded-full overflow-hidden flex-shrink-0 ${className}`}
      style={{
        width: s,
        height: s,
        animation: 'spin 1.1s linear infinite',
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`https://flagcdn.com/w${cdnW}/${code}.png`}
        alt=""
        width={imgW}
        height={imgH}
        style={{
          width: s,
          height: s,
          objectFit: 'cover',
          objectPosition: 'center',
          display: 'block',
        }}
      />
    </div>
  )
}

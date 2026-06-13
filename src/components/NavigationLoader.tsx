'use client'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import SpinFlag from './SpinFlag'

const MIN_VISIBLE_MS = 1000  // minimum time the spinner stays visible
const FADE_MS        = 250   // fade-out duration

export default function NavigationLoader() {
  const pathname  = usePathname()
  const prevPath  = useRef(pathname)
  const [visible, setVisible] = useState(false)
  const [fading,  setFading]  = useState(false)
  const hideTimer = useRef<ReturnType<typeof setTimeout>>()
  const fadeTimer = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    // Don't fire on initial mount — only real navigations
    if (pathname === prevPath.current) return
    prevPath.current = pathname

    // Cancel any pending hide
    clearTimeout(hideTimer.current)
    clearTimeout(fadeTimer.current)

    // Show immediately, reset fade state
    setFading(false)
    setVisible(true)

    // After MIN_VISIBLE_MS, start fade-out
    hideTimer.current = setTimeout(() => {
      setFading(true)
      fadeTimer.current = setTimeout(() => setVisible(false), FADE_MS)
    }, MIN_VISIBLE_MS)
  }, [pathname])

  // Cleanup on unmount
  useEffect(() => () => {
    clearTimeout(hideTimer.current)
    clearTimeout(fadeTimer.current)
  }, [])

  if (!visible) return null

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center pointer-events-none"
      style={{
        opacity: fading ? 0 : 1,
        transition: fading ? `opacity ${FADE_MS}ms ease-out` : 'none',
      }}
    >
      <SpinFlag size={64} />
    </div>
  )
}

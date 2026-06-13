'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useAuthStore } from '@/store/auth'
import { useThemeStore } from '@/store/theme'
import { useRouter, usePathname } from 'next/navigation'
import { logActivity } from '@/lib/activity'

const ALL_LINKS = [
  { href: '/', label: 'Lịch thi đấu' },
  { href: '/predict', label: 'Dự đoán' },
  { href: '/history', label: 'Lịch sử' },
  { href: '/standings', label: 'Bảng đấu' },
  { href: '/leaderboard', label: 'Xếp hạng' },
  { href: '/champion', label: 'Nhà vô địch' },
  { href: '/bracket', label: 'Bracket' },
  { href: '/h2h', label: 'H2H' },
  { href: '/groups', label: 'Nhóm' },
]

export default function Navbar() {
  const { user, loading, init, signOut } = useAuthStore()
  const { dark, toggle, init: initTheme } = useThemeStore()
  const router = useRouter()
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)
  const [clock, setClock] = useState('')

  useEffect(() => {
    function tick() {
      setClock(new Date().toLocaleTimeString('vi-VN', {
        timeZone: 'Asia/Ho_Chi_Minh',
        hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
      }))
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => { init() }, [init])
  useEffect(() => { initTheme() }, [initTheme])
  useEffect(() => { setMenuOpen(false) }, [pathname])

  const bg       = dark ? '#001f3f' : '#ffffff'
  const border   = dark ? '#1a3a5c' : '#d1dbe8'
  const textMid  = dark ? '#94b8d4' : '#475569'
  const textMute = dark ? '#5a8aaa' : '#94a3b8'
  const hoverBg  = dark ? '#002a52' : '#f1f5f9'
  const pts = user?.total_points ?? 0
  const ptsBg    = pts < 0 ? (dark ? '#3b0a0a' : '#fee2e2') : pts > 0 ? (dark ? '#002a52' : 'var(--brand-bg)') : (dark ? '#1e293b' : '#f1f5f9')
  const ptsColor = pts < 0 ? (dark ? '#fca5a5' : '#dc2626')  : pts > 0 ? (dark ? '#7db3e0' : 'var(--brand)')   : (dark ? '#64748b' : '#94a3b8')
  const menuBg   = dark ? '#001a35' : '#f8fafc'

  return (
    <>
      <nav className="sticky top-0 z-50 border-b shadow-sm" style={{ background: bg, borderColor: border }}>
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-2">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 shrink-0 select-none">
            <span className="font-black text-[22px] tracking-tight leading-none">
              WC<span style={{ color: 'var(--accent)' }}>{`.88`}</span>
            </span>
          </Link>

          {/* VN clock — desktop only */}
          {clock && (
            <div className="hidden md:flex items-center gap-1.5 shrink-0 px-3 py-1 rounded-lg"
              style={{ background: dark ? '#001a35' : '#f1f5f9' }}>
              <span className="text-xs" style={{ color: textMute }}>🇻🇳</span>
              <span className="font-mono text-sm font-semibold tabular-nums" style={{ color: textMid }}>{clock}</span>
            </div>
          )}

          {/* Desktop nav — all links on md+ */}
          <div className="hidden md:flex items-center gap-0.5 flex-1 overflow-x-auto">
            {ALL_LINKS.map(l => {
              const active = pathname === l.href
              return (
                <Link key={l.href} href={l.href}
                  className="px-2.5 py-1.5 rounded-md text-[13px] transition-colors whitespace-nowrap shrink-0"
                  style={{
                    background: active ? (dark ? '#003366' : 'var(--brand-bg)') : undefined,
                    color: active ? (dark ? '#7db3e0' : 'var(--brand)') : textMid,
                    fontWeight: active ? 600 : 500,
                  }}
                  onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = hoverBg }}
                  onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = '' }}
                >
                  {l.label}
                </Link>
              )
            })}
            {user?.role === 'admin' && (
              <Link href="/admin"
                className="px-2.5 py-1.5 rounded-md text-[13px] font-medium transition-colors shrink-0"
                style={{ color: 'var(--accent)' }}
              >Admin</Link>
            )}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Hamburger — mobile only */}
            <button
              onClick={() => setMenuOpen(v => !v)}
              className="md:hidden w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
              style={{ color: textMid }}
              aria-label="Menu"
            >
              {menuOpen ? (
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path d="M2 2L16 16M16 2L2 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path d="M2 4H16M2 9H16M2 14H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              )}
            </button>

            <button
              onClick={toggle}
              className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors text-base"
              style={{ color: textMute }}
              title={dark ? 'Chế độ sáng' : 'Chế độ tối'}
            >
              {dark ? '☀️' : '🌙'}
            </button>

            {loading ? (
              <div className="w-16 h-7 rounded animate-pulse" style={{ background: dark ? '#1a3a5c' : '#e2e8f0' }} />
            ) : user ? (
              <div className="flex items-center gap-2">
                <Link href={`/profile/${user.id}`} className="flex items-center gap-1.5 hover:opacity-75 transition-opacity">
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                    style={{ background: 'var(--brand)' }}
                  >
                    {user.display_name[0]?.toUpperCase()}
                  </div>
                  <span className="hidden sm:block text-sm max-w-24 truncate" style={{ color: textMid }}>
                    {user.display_name}
                  </span>
                </Link>
                <span
                  className="text-xs font-bold px-2 py-1 rounded-full whitespace-nowrap"
                  style={{ background: ptsBg, color: ptsColor }}
                >
                  {user.total_points} pts
                </span>
                <button
                  onClick={async () => {
                    logActivity({ action: 'logout', detail: { user_id: user?.id } })
                    await signOut()
                    router.push('/login')
                  }}
                  className="text-sm px-2 py-1 rounded transition-colors"
                  style={{ color: textMute }}
                >
                  Xuất
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="text-white font-semibold text-sm px-4 py-1.5 rounded-md hover:opacity-90 transition-opacity"
                style={{ background: 'var(--brand)' }}
              >
                Đăng nhập
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* Mobile dropdown menu */}
      {menuOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 md:hidden"
            onClick={() => setMenuOpen(false)}
          />
          {/* Menu panel */}
          <div
            className="fixed top-14 left-0 right-0 z-50 md:hidden border-b shadow-lg"
            style={{ background: bg, borderColor: border }}
          >
            <div className="max-w-5xl mx-auto px-4 py-2" style={{ background: menuBg }}>
              {clock && (
                <div className="flex items-center gap-2 px-3 py-2 mb-1 rounded-lg" style={{ background: dark ? '#001a35' : '#f1f5f9' }}>
                  <span className="text-sm">🇻🇳</span>
                  <span className="text-xs font-medium" style={{ color: textMute }}>Giờ Việt Nam</span>
                  <span className="ml-auto font-mono text-sm font-bold tabular-nums" style={{ color: textMid }}>{clock}</span>
                </div>
              )}
              {ALL_LINKS.map(l => {
                const active = pathname === l.href
                return (
                  <Link
                    key={l.href}
                    href={l.href}
                    className="flex items-center px-3 py-3 rounded-lg text-sm font-medium transition-colors"
                    style={{
                      color: active ? (dark ? '#93c5fd' : 'var(--brand)') : textMid,
                      background: active ? (dark ? '#003366' : 'var(--brand-bg)') : 'transparent',
                      fontWeight: active ? 600 : 500,
                    }}
                  >
                    {l.label}
                    {active && (
                      <span className="ml-auto w-1.5 h-1.5 rounded-full" style={{ background: dark ? '#93c5fd' : 'var(--brand)' }} />
                    )}
                  </Link>
                )
              })}
              {user?.role === 'admin' && (
                <Link href="/admin"
                  className="flex items-center px-3 py-3 rounded-lg text-sm font-medium"
                  style={{ color: 'var(--accent)' }}
                >
                  Admin ⚙️
                </Link>
              )}
            </div>
          </div>
        </>
      )}
    </>
  )
}

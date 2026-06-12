'use client'
import Link from 'next/link'
import { useEffect } from 'react'
import { useAuthStore } from '@/store/auth'
import { useThemeStore } from '@/store/theme'
import { useRouter, usePathname } from 'next/navigation'

export default function Navbar() {
  const { user, loading, init, signOut } = useAuthStore()
  const { dark, toggle, init: initTheme } = useThemeStore()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => { init() }, [init])
  useEffect(() => { initTheme() }, [initTheme])

  const links = [
    { href: '/', label: 'Lịch thi đấu' },
    { href: '/predict', label: 'Dự đoán' },
    { href: '/leaderboard', label: 'Xếp hạng' },
  ]

  return (
    <nav className="sticky top-0 z-50 border-b shadow-sm" style={{ background: '#fff', borderColor: '#d1dbe8' }}>
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-4">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 shrink-0 select-none">
          <span
            className="flex items-center justify-center w-8 h-8 rounded-lg text-white text-base font-black leading-none"
            style={{ background: 'var(--brand)' }}
          >⚽</span>
          <span className="font-black text-[22px] tracking-tight leading-none" style={{ color: 'var(--brand)' }}>
            WC<span style={{ color: 'var(--accent)' }}>88</span>
          </span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-0.5 flex-1">
          {links.map(l => {
            const active = pathname === l.href
            return (
              <Link key={l.href} href={l.href}
                className="px-3 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap"
                style={{
                  background: active ? 'var(--brand-bg)' : undefined,
                  color: active ? 'var(--brand)' : '#475569',
                  fontWeight: active ? 600 : 500,
                }}
              >
                {l.label}
              </Link>
            )
          })}
          {user?.role === 'admin' && (
            <Link href="/admin"
              className="px-3 py-1.5 rounded-md text-sm font-medium transition-colors"
              style={{ color: 'var(--accent)', fontWeight: 500 }}
            >Admin</Link>
          )}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={toggle}
            className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors text-base"
            style={{ color: '#64748b' }}
            title={dark ? 'Chế độ sáng' : 'Chế độ tối'}
          >
            {dark ? '☀️' : '🌙'}
          </button>

          {loading ? (
            <div className="w-16 h-7 rounded animate-pulse" style={{ background: '#e2e8f0' }} />
          ) : user ? (
            <div className="flex items-center gap-2">
              <Link href={`/profile/${user.id}`} className="flex items-center gap-1.5 hover:opacity-75 transition-opacity">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                  style={{ background: 'var(--brand)' }}
                >
                  {user.display_name[0]?.toUpperCase()}
                </div>
                <span className="hidden sm:block text-sm max-w-24 truncate" style={{ color: '#475569' }}>
                  {user.display_name}
                </span>
              </Link>
              <span
                className="text-xs font-bold px-2 py-1 rounded-full whitespace-nowrap"
                style={{ background: 'var(--brand-bg)', color: 'var(--brand)' }}
              >
                {user.total_points} pts
              </span>
              <button
                onClick={async () => { await signOut(); router.push('/login') }}
                className="text-sm px-2 py-1 rounded transition-colors"
                style={{ color: '#94a3b8' }}
              >
                Xuất
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="text-white font-semibold text-sm px-4 py-1.5 rounded-md transition-opacity hover:opacity-90"
              style={{ background: 'var(--brand)' }}
            >
              Đăng nhập
            </Link>
          )}
        </div>
      </div>
    </nav>
  )
}

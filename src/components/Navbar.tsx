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
    <nav className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-sm">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-4">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-1.5 flex-shrink-0 select-none">
          <span className="flex items-center justify-center w-8 h-8 rounded-lg text-white text-base font-black leading-none" style={{ background: 'var(--brand) !important' }}>
            ⚽
          </span>
          <span className="font-black text-[25px] tracking-tight leading-none" style={{ color: 'var(--brand) !important' }}>
            WC<span style={{ color: 'var(--accent) !important' }}> 88</span>
          </span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-0.5 flex-1">
          {links.map(l => (
            <Link key={l.href} href={l.href}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                pathname === l.href
                  ? 'bg-slate-100 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
              style={pathname === l.href ? { color: 'var(--brand) !important' } : undefined}
            >
              {l.label}
            </Link>
          ))}
          {user?.role === 'admin' && (
            <Link href="/admin"
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                pathname === '/admin' ? 'bg-amber-50' : 'text-amber-600 hover:bg-amber-50'
              }`}
              style={pathname === '/admin' ? { color: 'var(--accent)' } : undefined}
            >Admin</Link>
          )}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={toggle}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 transition-colors text-base"
            title={dark ? 'Chế độ sáng' : 'Chế độ tối'}
          >
            {dark ? '☀️' : '🌙'}
          </button>

          {loading ? (
            <div className="w-16 h-7 bg-slate-200 rounded animate-pulse" />
          ) : user ? (
            <div className="flex items-center gap-2">
              <Link href={`/profile/${user.id}`} className="flex items-center gap-1.5 hover:opacity-80 transition-opacity">
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ background: 'var(--brand) !important' }}>
                  {user.display_name[0]?.toUpperCase()}
                </div>
                <span className="hidden sm:block text-sm text-slate-600 max-w-[6rem] truncate">{user.display_name}</span>
              </Link>
              <span className="text-xs font-bold px-2 py-1 rounded-full whitespace-nowrap" style={{ background: 'var(--brand-bg)', color: 'var(--brand) !important' }}>
                {user.total_points} pts
              </span>
              <button
                onClick={async () => { await signOut(); router.push('/login') }}
                className="text-slate-400 hover:text-slate-600 text-sm px-2 py-1 rounded hover:bg-slate-100 transition-colors"
              >
                Xuất
              </button>
            </div>
          ) : (
            <Link href="/login"
              className="text-white font-semibold text-sm px-4 py-1.5 rounded-md transition-colors"
              style={{ background: 'var(--brand) !important' }}
            >
              Đăng nhập
            </Link>
          )}
        </div>
      </div>
    </nav>
  )
}

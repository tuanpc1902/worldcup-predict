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
    { href: '/bracket', label: 'Bracket' },
    { href: '/leaderboard', label: 'Xếp hạng' },
    { href: '/groups', label: 'Nhóm' },
    { href: '/champion', label: '🏆 Vô địch' },
  ]

  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-sm">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-bold text-slate-900 text-lg flex-shrink-0">
          ⚽ <span className="text-green-600">WorldCup</span><span className="text-slate-700 hidden sm:inline"> Predict</span>
        </Link>

        <div className="hidden lg:flex items-center gap-0.5 overflow-x-auto">
          {links.map(l => (
            <Link key={l.href} href={l.href}
              className={`px-2.5 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                pathname === l.href
                  ? 'bg-green-50 text-green-700 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}>
              {l.label}
            </Link>
          ))}
          {user?.role === 'admin' && (
            <Link href="/admin" className={`px-2.5 py-1.5 rounded-md text-sm font-medium transition-colors ${
              pathname === '/admin' ? 'bg-amber-50 text-amber-700' : 'text-amber-600 hover:bg-amber-50'
            }`}>Admin</Link>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Dark mode toggle */}
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
              <Link href={`/profile/${user.id}`} className="hidden sm:flex items-center gap-1.5 hover:opacity-80 transition-opacity">
                <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center text-xs font-bold text-green-700">
                  {user.display_name[0]?.toUpperCase()}
                </div>
                <span className="text-sm text-slate-600 max-w-24 truncate">{user.display_name}</span>
              </Link>
              <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded-full whitespace-nowrap">
                {user.total_points} pts
              </span>
              <button onClick={async () => { await signOut(); router.push('/login') }}
                className="text-slate-400 hover:text-slate-700 text-sm transition-colors px-2 py-1 rounded hover:bg-slate-100">
                Xuất
              </button>
            </div>
          ) : (
            <Link href="/login"
              className="bg-green-600 hover:bg-green-700 text-white font-semibold text-sm px-4 py-1.5 rounded-md transition-colors">
              Đăng nhập
            </Link>
          )}
        </div>
      </div>
    </nav>
  )
}

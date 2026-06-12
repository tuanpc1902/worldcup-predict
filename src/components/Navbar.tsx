'use client'
import Link from 'next/link'
import { useEffect } from 'react'
import { useAuthStore } from '@/store/auth'
import { useRouter, usePathname } from 'next/navigation'

export default function Navbar() {
  const { user, loading, init, signOut } = useAuthStore()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => { init() }, [init])

  const links = [
    { href: '/', label: 'Lịch thi đấu' },
    { href: '/predict', label: 'Dự đoán' },
    { href: '/leaderboard', label: 'Bảng xếp hạng' },
    { href: '/history', label: 'Lịch sử' },
  ]

  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-sm">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-bold text-slate-900 text-lg">
          ⚽ <span className="text-green-600">WorldCup</span><span className="text-slate-700"> Predict</span>
        </Link>

        <div className="hidden md:flex items-center gap-1">
          {links.map(l => (
            <Link
              key={l.href}
              href={l.href}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                pathname === l.href
                  ? 'bg-green-50 text-green-700 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              {l.label}
            </Link>
          ))}
          {user?.role === 'admin' && (
            <Link
              href="/admin"
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                pathname === '/admin'
                  ? 'bg-amber-50 text-amber-700 font-semibold'
                  : 'text-amber-600 hover:bg-amber-50'
              }`}
            >
              Admin
            </Link>
          )}
        </div>

        <div className="flex items-center gap-3">
          {loading ? (
            <div className="w-20 h-7 bg-slate-200 rounded animate-pulse" />
          ) : user ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-600 hidden sm:block">{user.display_name}</span>
              <span className="bg-green-100 text-green-700 text-xs font-bold px-2.5 py-1 rounded-full">
                {user.total_points} pts
              </span>
              <button
                onClick={async () => { await signOut(); router.push('/login') }}
                className="text-slate-400 hover:text-slate-700 text-sm transition-colors"
              >
                Đăng xuất
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="bg-green-600 hover:bg-green-700 text-white font-semibold text-sm px-4 py-1.5 rounded-md transition-colors"
            >
              Đăng nhập
            </Link>
          )}
        </div>
      </div>
    </nav>
  )
}

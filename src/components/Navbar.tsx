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
    <nav className="sticky top-0 z-50 bg-gray-900 border-b border-gray-800">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-bold text-white text-lg">
          ⚽ <span className="text-yellow-400">WorldCup</span> Predict
        </Link>

        <div className="hidden md:flex items-center gap-1">
          {links.map(l => (
            <Link
              key={l.href}
              href={l.href}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                pathname === l.href
                  ? 'bg-gray-700 text-white'
                  : 'text-gray-300 hover:text-white hover:bg-gray-800'
              }`}
            >
              {l.label}
            </Link>
          ))}
          {user?.role === 'admin' && (
            <Link
              href="/admin"
              className="px-3 py-1.5 rounded-md text-sm font-medium text-yellow-400 hover:bg-gray-800"
            >
              Admin
            </Link>
          )}
        </div>

        <div className="flex items-center gap-3">
          {loading ? (
            <div className="w-20 h-7 bg-gray-700 rounded animate-pulse" />
          ) : user ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-300 hidden sm:block">{user.display_name}</span>
              <span className="bg-yellow-500 text-black text-xs font-bold px-2 py-1 rounded-full">
                {user.total_points} pts
              </span>
              <button
                onClick={async () => { await signOut(); router.push('/login') }}
                className="text-gray-400 hover:text-white text-sm"
              >
                Đăng xuất
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="bg-yellow-500 hover:bg-yellow-400 text-black font-semibold text-sm px-4 py-1.5 rounded-md transition-colors"
            >
              Đăng nhập
            </Link>
          )}
        </div>
      </div>
    </nav>
  )
}

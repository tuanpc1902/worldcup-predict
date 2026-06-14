'use client'
import { usePathname } from 'next/navigation'
import Link from 'next/link'

const NAV = [
  { label: 'Trận đấu', href: '/admin', icon: '⚽', exact: true },
  { label: 'Tạo TK', href: '/admin/create-users', icon: '➕' },
  { label: 'Tài khoản', href: '/admin/users', icon: '👥' },
  { label: 'Thống kê', href: '/admin/stats', icon: '📊' },
  { label: 'Logs', href: '/admin/logs', icon: '📋' },
  { label: 'Config', href: '/admin/config', icon: '⚙️' },
  { label: 'Reset', href: '/admin/reset', icon: '🗑️' },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  function isActive(href: string, exact?: boolean) {
    return exact ? pathname === href : pathname.startsWith(href)
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-white text-sm font-black">A</div>
        <div>
          <h1 className="text-lg font-bold text-slate-800 leading-none">Admin Panel</h1>
          <p className="text-xs text-slate-400 mt-0.5">WC-88 · World Cup 2026</p>
        </div>
      </div>

      {/* Tab nav */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
        {NAV.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex-1 flex items-center justify-center gap-1.5 text-sm font-medium px-3 py-2 rounded-lg transition-all ${
              isActive(item.href, item.exact)
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <span className="text-base leading-none">{item.icon}</span>
            <span className="hidden sm:inline">{item.label}</span>
          </Link>
        ))}
      </div>

      {/* Page content */}
      {children}
    </div>
  )
}

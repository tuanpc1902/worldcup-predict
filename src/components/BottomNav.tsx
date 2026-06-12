'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV = [
  { href: '/', icon: '📅', label: 'Lịch' },
  { href: '/predict', icon: '🎯', label: 'Dự đoán' },
  { href: '/leaderboard', icon: '🏆', label: 'Xếp hạng' },
  { href: '/h2h', icon: '⚔️', label: 'H2H' },
  { href: '/champion', icon: '🌟', label: 'Vô địch' },
]

export default function BottomNav() {
  const pathname = usePathname()
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 md:hidden safe-area-pb">
      <div className="flex">
        {NAV.map(n => (
          <Link key={n.href} href={n.href}
            className={`flex-1 flex flex-col items-center py-2 gap-0.5 transition-colors ${
              pathname === n.href ? 'text-green-600' : 'text-slate-400 hover:text-slate-600'
            }`}>
            <span className="text-xl leading-none">{n.icon}</span>
            <span className={`text-[10px] font-medium ${pathname === n.href ? 'text-green-600' : 'text-slate-400'}`}>
              {n.label}
            </span>
          </Link>
        ))}
      </div>
    </nav>
  )
}

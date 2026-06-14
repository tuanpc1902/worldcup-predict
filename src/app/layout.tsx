import type { Metadata } from 'next'
import './globals.css'
import Navbar from '@/components/Navbar'
import BottomNav from '@/components/BottomNav'
import NavigationLoader from '@/components/NavigationLoader'
import MaintenanceGate from '@/components/MaintenanceGate'

export const metadata: Metadata = {
  title: 'World Cup - Predict 2026 | WC-88',
  description: 'Dự đoán kết quả World Cup 2026',
  manifest: '/manifest.json',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body className="bg-slate-50 text-slate-900 min-h-screen">
        <NavigationLoader />
        <Navbar />
        <MaintenanceGate>
          <main className="max-w-5xl mx-auto px-4 py-6 pb-24 md:pb-6">{children}</main>
        </MaintenanceGate>
        <BottomNav />
      </body>
    </html>
  )
}

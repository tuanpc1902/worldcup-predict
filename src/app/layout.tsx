import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import './globals.css'
import Navbar from '@/components/Navbar'
import BottomNav from '@/components/BottomNav'

const geist = Geist({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'WC-88',
  description: 'Dự đoán kết quả World Cup 2026 cùng đồng nghiệp',
  manifest: '/manifest.json',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body className={`${geist.className} bg-slate-50 text-slate-900 min-h-screen`}>
        <Navbar />
        <main className="max-w-5xl mx-auto px-4 py-6 pb-24 md:pb-6">{children}</main>
        <BottomNav />
      </body>
    </html>
  )
}

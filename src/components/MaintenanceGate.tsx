'use client'
import { useEffect } from 'react'
import { useAuthStore } from '@/store/auth'
import { useConfigStore } from '@/store/config'

export default function MaintenanceGate({ children }: { children: React.ReactNode }) {
  const { user, init } = useAuthStore()
  const { config, load } = useConfigStore()

  useEffect(() => { init() }, [init])
  useEffect(() => { load() }, [load])

  if (config.maintenance_mode && user?.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="text-center max-w-sm">
          <div className="text-6xl mb-4">🔧</div>
          <h1 className="text-2xl font-bold text-slate-800 mb-2">Đang bảo trì</h1>
          <p className="text-slate-500 text-sm leading-relaxed">
            Hệ thống đang được nâng cấp. Vui lòng quay lại sau ít phút.
          </p>
          <p className="text-xs text-slate-400 mt-4">WC-88 · World Cup 2026</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}

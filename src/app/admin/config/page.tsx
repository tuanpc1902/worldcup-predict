'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth'
import { useConfigStore } from '@/store/config'

interface ConfigRow {
  key: string
  value: string
  label: string
  description: string | null
  updated_at: string
}

const GROUPS = [
  {
    title: 'Hệ thống',
    icon: '🚨',
    keys: ['maintenance_mode', 'registration_open'],
  },
  {
    title: 'Realtime',
    icon: '⚡',
    keys: ['realtime_leaderboard', 'realtime_match', 'realtime_profile'],
  },
  {
    title: 'Tính năng',
    icon: '🔧',
    keys: ['predictions_open', 'predictions_editable', 'comments_enabled', 'champion_picks_open', 'group_creation_open'],
  },
  {
    title: 'Hiển thị',
    icon: '👁️',
    keys: ['show_scores', 'show_prediction_stats', 'show_goals', 'show_leaderboard_points'],
  },
  {
    title: 'Navbar — Tabs hiển thị',
    icon: '🧭',
    keys: ['nav_predict', 'nav_history', 'nav_standings', 'nav_leaderboard', 'nav_champion', 'nav_bracket', 'nav_h2h', 'nav_groups'],
  },
]

export default function ConfigPage() {
  const { user, init, loading } = useAuthStore()
  const { set: setLocalConfig } = useConfigStore()
  const router = useRouter()
  const [rows, setRows] = useState<ConfigRow[]>([])
  const [fetching, setFetching] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [msg, setMsg] = useState<{ key: string; ok: boolean } | null>(null)

  useEffect(() => { init() }, [init])
  useEffect(() => {
    if (!loading && (!user || user.role !== 'admin')) router.replace('/')
  }, [user, loading, router])

  useEffect(() => {
    fetch('/api/admin/config')
      .then(r => r.json())
      .then(data => { setRows(data ?? []); setFetching(false) })
  }, [])

  async function toggle(key: string, currentValue: string) {
    const newVal = currentValue !== 'true'
    setSaving(key)
    setMsg(null)
    const res = await fetch('/api/admin/config', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, value: newVal }),
    })
    if (res.ok) {
      setRows(prev => prev.map(r => r.key === key ? { ...r, value: String(newVal), updated_at: new Date().toISOString() } : r))
      // Also update local Zustand store immediately
      setLocalConfig(key as Parameters<typeof setLocalConfig>[0], newVal)
      setMsg({ key, ok: true })
    } else {
      setMsg({ key, ok: false })
    }
    setSaving(null)
    setTimeout(() => setMsg(null), 2000)
  }

  const rowMap = Object.fromEntries(rows.map(r => [r.key, r]))

  if (fetching) return (
    <div className="space-y-4 animate-pulse">
      {[...Array(3)].map((_, i) => <div key={i} className="h-32 bg-white rounded-xl border border-slate-200" />)}
    </div>
  )

  return (
    <div className="space-y-5 max-w-2xl">
      {GROUPS.map(group => (
        <div key={group.title} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-3 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
            <span>{group.icon}</span>
            <h2 className="font-bold text-sm text-slate-700">{group.title}</h2>
          </div>
          <div className="divide-y divide-slate-50">
            {group.keys.map(key => {
              const row = rowMap[key]
              if (!row) return null
              const isOn = row.value === 'true'
              const isSaving = saving === key
              const feedback = msg?.key === key
              return (
                <div key={key} className="flex items-center gap-4 px-5 py-3.5">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-800">{row.label}</div>
                    {row.description && (
                      <div className="text-xs text-slate-400 mt-0.5">{row.description}</div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {feedback && (
                      <span className={`text-xs ${msg!.ok ? 'text-green-500' : 'text-red-500'}`}>
                        {msg!.ok ? '✓' : '✗'}
                      </span>
                    )}
                    <button
                      onClick={() => toggle(key, row.value)}
                      disabled={isSaving}
                      className={`relative w-11 h-6 rounded-full transition-all duration-200 focus:outline-none disabled:opacity-50 ${
                        isOn ? 'bg-green-500' : 'bg-slate-300'
                      }`}
                      title={isOn ? 'Bật — click để tắt' : 'Tắt — click để bật'}
                    >
                      <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${
                        isOn ? 'translate-x-5' : 'translate-x-0'
                      }`} />
                    </button>
                    <span className={`text-xs font-semibold w-6 ${isOn ? 'text-green-600' : 'text-slate-400'}`}>
                      {isOn ? 'ON' : 'OFF'}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}

      <p className="text-xs text-slate-400 text-center">
        Thay đổi có hiệu lực ngay lập tức — user cần reload để thấy thay đổi nav.
      </p>
    </div>
  )
}

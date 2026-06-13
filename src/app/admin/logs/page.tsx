'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth'

interface LogEntry {
  id: number
  user_id: string | null
  action: string
  page: string | null
  detail: Record<string, unknown>
  ip: string | null
  user_agent: string | null
  device_type: string | null
  os: string | null
  browser: string | null
  referer: string | null
  created_at: string
  profiles?: { display_name: string } | null
}

const ACTION_COLORS: Record<string, string> = {
  login: 'bg-green-100 text-green-700',
  logout: 'bg-slate-100 text-slate-500',
  register: 'bg-blue-100 text-blue-700',
  predict_submit: 'bg-yellow-100 text-yellow-700',
  predict_save_all: 'bg-orange-100 text-orange-700',
  champion_pick: 'bg-purple-100 text-purple-700',
  group_create: 'bg-teal-100 text-teal-700',
  group_join_request: 'bg-cyan-100 text-cyan-700',
  group_join_approve: 'bg-emerald-100 text-emerald-700',
  group_join_reject: 'bg-red-100 text-red-600',
  h2h_compare: 'bg-indigo-100 text-indigo-700',
  page_view: 'bg-slate-100 text-slate-400',
  admin_match_update: 'bg-rose-100 text-rose-700',
}

function timeAgo(dt: string) {
  const diff = Date.now() - new Date(dt).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'vừa xong'
  if (m < 60) return `${m} phút trước`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}g trước`
  return new Date(dt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })
}

const PAGE_SIZE = 100

export default function AdminLogsPage() {
  const { user, init } = useAuthStore()
  const router = useRouter()
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [offset, setOffset] = useState(0)
  const [filterAction, setFilterAction] = useState('')
  const [expandedId, setExpandedId] = useState<number | null>(null)

  useEffect(() => { init() }, [init])
  useEffect(() => { if (user && user.role !== 'admin') router.replace('/') }, [user, router])

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(offset) })
    if (filterAction) params.set('action', filterAction)
    const res = await fetch(`/api/admin/logs?${params}`)
    if (res.ok) {
      const d = await res.json()
      setLogs(d.logs)
      setTotal(d.total)
    }
    setLoading(false)
  }, [offset, filterAction])

  useEffect(() => { if (user?.role === 'admin') load() }, [user, load])

  const deviceIcon = (dt: string | null) =>
    dt === 'mobile' ? '📱' : dt === 'tablet' ? '📟' : '🖥️'

  const uniqueActions = Array.from(new Set(logs.map(l => l.action))).sort()

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-xl font-bold text-slate-800">Activity Logs</h1>
        <span className="text-sm text-slate-400">{total.toLocaleString()} bản ghi</span>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <select
          value={filterAction}
          onChange={e => { setFilterAction(e.target.value); setOffset(0) }}
          className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 bg-white"
        >
          <option value="">Tất cả hành vi</option>
          {uniqueActions.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <button onClick={() => load()} className="text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl transition-colors">
          🔄 Tải lại
        </button>
      </div>

      {/* Log table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-8 text-center text-slate-400 text-sm">Đang tải...</div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">Không có log nào</div>
        ) : (
          <div className="divide-y divide-slate-50">
            {logs.map(log => (
              <div key={log.id}>
                <div
                  className="flex items-start gap-3 px-4 py-3 hover:bg-slate-50/60 cursor-pointer"
                  onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                >
                  <span className="text-lg shrink-0 mt-0.5">{deviceIcon(log.device_type)}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${ACTION_COLORS[log.action] ?? 'bg-slate-100 text-slate-600'}`}>
                        {log.action}
                      </span>
                      <span className="text-sm font-medium text-slate-700 truncate">
                        {log.profiles?.display_name ?? <span className="text-slate-400 italic">ẩn danh</span>}
                      </span>
                      {log.page && (
                        <span className="text-xs text-slate-400 truncate max-w-[200px]">{log.page}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-400 flex-wrap">
                      <span>{log.browser ?? '?'} · {log.os ?? '?'}</span>
                      {log.ip && <span>· {log.ip}</span>}
                      <span>· {timeAgo(log.created_at)}</span>
                    </div>
                  </div>
                  <span className="text-slate-300 text-sm shrink-0">{expandedId === log.id ? '▲' : '▼'}</span>
                </div>

                {expandedId === log.id && (
                  <div className="px-4 pb-3 ml-9 space-y-2 border-t border-slate-50 pt-2">
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-500">
                      <div><span className="font-medium">User ID:</span> {log.user_id ?? '—'}</div>
                      <div><span className="font-medium">IP:</span> {log.ip ?? '—'}</div>
                      <div><span className="font-medium">OS:</span> {log.os ?? '—'}</div>
                      <div><span className="font-medium">Browser:</span> {log.browser ?? '—'}</div>
                      <div><span className="font-medium">Device:</span> {log.device_type ?? '—'}</div>
                      <div><span className="font-medium">Referer:</span> {log.referer ? <span className="truncate">{log.referer}</span> : '—'}</div>
                      <div className="col-span-2"><span className="font-medium">UA:</span> <span className="font-mono text-[10px] break-all">{log.user_agent ?? '—'}</span></div>
                      <div className="col-span-2">
                        <span className="font-medium">Detail:</span>
                        <pre className="font-mono text-[10px] bg-slate-50 rounded p-2 mt-1 overflow-x-auto whitespace-pre-wrap">
                          {JSON.stringify(log.detail, null, 2)}
                        </pre>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {total > PAGE_SIZE && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-500">{offset + 1}–{Math.min(offset + PAGE_SIZE, total)} / {total}</span>
          <div className="flex gap-2">
            <button onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))} disabled={offset === 0}
              className="text-sm px-4 py-2 border border-slate-200 rounded-xl disabled:opacity-40 hover:bg-slate-50">
              ← Trước
            </button>
            <button onClick={() => setOffset(offset + PAGE_SIZE)} disabled={offset + PAGE_SIZE >= total}
              className="text-sm px-4 py-2 border border-slate-200 rounded-xl disabled:opacity-40 hover:bg-slate-50">
              Sau →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

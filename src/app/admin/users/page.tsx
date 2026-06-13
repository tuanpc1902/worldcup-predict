'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth'

type Provider = 'email' | 'google'

interface User {
  id: string
  email: string
  display_name: string
  provider: Provider
  is_wc: boolean
  created_at: string
  last_sign_in_at: string | null
  total_points: number
}

type TabType = 'all' | 'wc' | 'google'

const TABS: { id: TabType; label: string; icon: string }[] = [
  { id: 'all', label: 'Tất cả', icon: '👤' },
  { id: 'wc', label: '@wc.88', icon: '⚽' },
  { id: 'google', label: 'Google', icon: '🔵' },
]

function randomPassword(len = 10) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#'
  return Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

function fmt(dt: string | null) {
  if (!dt) return '—'
  return new Date(dt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })
}

export default function AdminUsersPage() {
  const { user, init } = useAuthStore()
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [total, setTotal] = useState(0)
  const [tab, setTab] = useState<TabType>('all')
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const [resetTarget, setResetTarget] = useState<User | null>(null)
  const [newPw, setNewPw] = useState('')
  const [resetting, setResetting] = useState(false)
  const [resetMsg, setResetMsg] = useState('')

  const [deleteTarget, setDeleteTarget] = useState<User | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => { init() }, [init])
  useEffect(() => {
    if (user && user.role !== 'admin') router.replace('/')
  }, [user, router])

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/admin/users?type=${tab}`)
    if (res.ok) {
      const d = await res.json()
      setUsers(d.users)
      setTotal(d.total)
    }
    setLoading(false)
  }, [tab])

  useEffect(() => { if (user?.role === 'admin') load() }, [user, load])

  async function doReset() {
    if (!resetTarget || !newPw) return
    setResetting(true)
    const res = await fetch('/api/admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: resetTarget.id, new_password: newPw }),
    })
    const d = await res.json()
    setResetting(false)
    if (res.ok) {
      setResetMsg('✓ Đổi mật khẩu thành công')
      setTimeout(() => { setResetTarget(null); setNewPw(''); setResetMsg('') }, 1500)
    } else {
      setResetMsg('❌ ' + d.message)
    }
  }

  async function doDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    const res = await fetch('/api/admin/users', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: deleteTarget.id }),
    })
    setDeleting(false)
    if (res.ok) {
      setUsers(prev => prev.filter(u => u.id !== deleteTarget.id))
      setTotal(prev => prev - 1)
      setDeleteTarget(null)
    }
  }

  const filtered = users.filter(u => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return u.email.toLowerCase().includes(q) || u.display_name.toLowerCase().includes(q)
  })

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800">Quản lý tài khoản</h1>
        <span className="text-sm text-slate-400">{total} tổng</span>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
              tab === t.id ? 'bg-green-600 text-white shadow' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}>
            <span>{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* Search */}
      <input
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Tìm theo email hoặc tên..."
        className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
      />

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-8 text-center text-slate-400 text-sm">Đang tải...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">Không có tài khoản nào</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-slate-500">Tài khoản</th>
                <th className="text-right px-4 py-3 font-medium text-slate-500 hidden sm:table-cell">Điểm</th>
                <th className="text-right px-4 py-3 font-medium text-slate-500 hidden md:table-cell">Đăng nhập lần cuối</th>
                <th className="text-right px-4 py-3 font-medium text-slate-500">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map(u => (
                <tr key={u.id} className="hover:bg-slate-50/50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {u.provider === 'google' ? (
                        <span className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-600">G</span>
                      ) : (
                        <span className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center text-xs">⚽</span>
                      )}
                      <div>
                        <div className="font-medium text-slate-800 truncate max-w-[140px]">{u.display_name}</div>
                        <div className="text-xs text-slate-400 truncate max-w-[180px]">{u.email}</div>
                      </div>
                      {u.provider === 'google' && (
                        <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-medium hidden sm:inline">Google</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right hidden sm:table-cell">
                    <span className="font-semibold text-slate-700">{u.total_points}</span>
                  </td>
                  <td className="px-4 py-3 text-right text-slate-400 text-xs hidden md:table-cell">{fmt(u.last_sign_in_at)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      {u.provider === 'email' && (
                        <button onClick={() => { setResetTarget(u); setNewPw(randomPassword()) }}
                          className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg transition-colors">
                          Đổi MK
                        </button>
                      )}
                      {u.provider === 'google' && (
                        <span className="text-xs text-slate-400 italic px-1">OAuth</span>
                      )}
                      <button onClick={() => setDeleteTarget(u)}
                        className="text-xs bg-red-50 hover:bg-red-100 text-red-600 px-3 py-1.5 rounded-lg transition-colors">
                        Xóa
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Reset password modal */}
      {resetTarget && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setResetTarget(null)}>
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm space-y-4" onClick={e => e.stopPropagation()}>
            <h2 className="font-bold text-slate-800">Đổi mật khẩu</h2>
            <p className="text-sm text-slate-500">{resetTarget.email}</p>
            <div className="flex gap-2">
              <input value={newPw} onChange={e => setNewPw(e.target.value)}
                className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-green-400" />
              <button onClick={() => setNewPw(randomPassword())}
                className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 rounded-xl transition-colors">
                Random
              </button>
            </div>
            {resetMsg && <p className="text-sm">{resetMsg}</p>}
            <div className="flex gap-2">
              <button onClick={() => setResetTarget(null)}
                className="flex-1 border border-slate-200 text-slate-600 py-2 rounded-xl text-sm hover:bg-slate-50">
                Hủy
              </button>
              <button onClick={doReset} disabled={resetting || !newPw}
                className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white py-2 rounded-xl text-sm font-semibold">
                {resetting ? '...' : 'Lưu'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setDeleteTarget(null)}>
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm space-y-4" onClick={e => e.stopPropagation()}>
            <h2 className="font-bold text-slate-800">Xóa tài khoản?</h2>
            <p className="text-sm text-slate-500">
              <strong>{deleteTarget.display_name}</strong> ({deleteTarget.email}) sẽ bị xóa vĩnh viễn.
            </p>
            <div className="flex gap-2">
              <button onClick={() => setDeleteTarget(null)}
                className="flex-1 border border-slate-200 text-slate-600 py-2 rounded-xl text-sm hover:bg-slate-50">
                Hủy
              </button>
              <button onClick={doDelete} disabled={deleting}
                className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white py-2 rounded-xl text-sm font-semibold">
                {deleting ? '...' : 'Xóa'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

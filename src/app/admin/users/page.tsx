'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuthStore } from '@/store/auth'

interface ManagedUser {
  id: string
  email: string
  display_name: string
  total_points: number
  created_at: string
  last_sign_in_at: string | null
}

const PWD_CHARS = 'abcdefghjkmnpqrstuvwxyz23456789ABCDEFGHJKMNPQRSTUVWXYZ'
function genPassword(len = 10) {
  const buf = new Uint8Array(len)
  crypto.getRandomValues(buf)
  return Array.from(buf).map(b => PWD_CHARS[b % PWD_CHARS.length]).join('')
}

export default function AdminUsersPage() {
  const { user, init, loading } = useAuthStore()
  const router = useRouter()

  const [domain, setDomain] = useState('wc.88')
  const [users, setUsers] = useState<ManagedUser[]>([])
  const [fetching, setFetching] = useState(false)
  const [search, setSearch] = useState('')
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null)

  // Reset password modal
  const [resetUser, setResetUser] = useState<ManagedUser | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [resetting, setResetting] = useState(false)

  // Delete confirm
  const [deleteUser, setDeleteUser] = useState<ManagedUser | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => { init() }, [init])
  useEffect(() => { if (!loading && (!user || user.role !== 'admin')) router.replace('/') }, [user, loading, router])

  function flash(text: string, ok: boolean) {
    setMsg({ text, ok })
    setTimeout(() => setMsg(null), 4000)
  }

  async function loadUsers() {
    setFetching(true)
    const res = await fetch(`/api/admin/users?domain=${encodeURIComponent(domain)}`)
    const json = await res.json()
    setUsers(json.users ?? [])
    setFetching(false)
  }

  useEffect(() => { if (user?.role === 'admin') loadUsers() }, [user])

  async function resetPassword() {
    if (!resetUser || !newPassword.trim()) return
    setResetting(true)
    const res = await fetch('/api/admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: resetUser.id, new_password: newPassword }),
    })
    const json = await res.json()
    if (res.ok) {
      flash(`✓ Đã đổi mật khẩu cho ${resetUser.display_name}`, true)
      setResetUser(null)
      setNewPassword('')
    } else {
      flash(`Lỗi: ${json.message}`, false)
    }
    setResetting(false)
  }

  async function confirmDelete() {
    if (!deleteUser) return
    setDeleting(true)
    const res = await fetch('/api/admin/users', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: deleteUser.id }),
    })
    const json = await res.json()
    if (res.ok) {
      flash(`Đã xóa tài khoản ${deleteUser.display_name}`, true)
      setUsers(prev => prev.filter(u => u.id !== deleteUser.id))
      setDeleteUser(null)
    } else {
      flash(`Lỗi: ${json.message}`, false)
    }
    setDeleting(false)
  }

  const filtered = users.filter(u =>
    u.display_name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) return <div className="h-48 bg-white rounded-xl border border-slate-200 animate-pulse" />

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">Quản lý tài khoản</h2>
          <p className="text-sm text-slate-500 mt-0.5">Đổi mật khẩu, xóa tài khoản đã tạo</p>
        </div>
        <Link href="/admin/create-users"
          className="text-sm bg-green-600 hover:bg-green-700 text-white font-semibold px-3 py-2 rounded-lg transition-colors">
          + Tạo thêm
        </Link>
      </div>

      {msg && (
        <div className={`rounded-lg px-4 py-3 text-sm font-medium ${msg.ok ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {msg.text}
        </div>
      )}

      {/* Filter bar */}
      <div className="flex gap-2 items-center">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Tìm theo tên hoặc email..."
          className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-green-500"
        />
        <div className="flex items-center gap-1.5 border border-slate-300 rounded-lg px-3 py-2 bg-white">
          <span className="text-xs text-slate-400">@</span>
          <input
            value={domain}
            onChange={e => setDomain(e.target.value)}
            className="text-sm text-slate-700 w-20 focus:outline-none"
            onBlur={loadUsers}
            onKeyDown={e => e.key === 'Enter' && loadUsers()}
          />
        </div>
        <button onClick={loadUsers} disabled={fetching}
          className="text-sm bg-slate-800 hover:bg-slate-900 disabled:opacity-50 text-white px-3 py-2 rounded-lg font-medium transition-colors">
          {fetching ? '...' : 'Lọc'}
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
          <span className="text-sm font-semibold text-slate-700">
            {filtered.length} tài khoản{domain ? ` · @${domain}` : ''}
          </span>
        </div>

        {fetching ? (
          <div className="divide-y divide-slate-50">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="px-4 py-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-slate-200 animate-pulse flex-shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 w-32 bg-slate-200 rounded animate-pulse" />
                  <div className="h-2.5 w-48 bg-slate-100 rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center text-slate-400 py-12 text-sm">Không tìm thấy tài khoản nào</div>
        ) : (
          <div className="divide-y divide-slate-50">
            {filtered
              .sort((a, b) => (b.total_points ?? 0) - (a.total_points ?? 0))
              .map(u => (
                <div key={u.id} className="px-4 py-3 flex items-center gap-3 hover:bg-slate-50 transition-colors">
                  <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-sm font-bold text-green-700 flex-shrink-0">
                    {u.display_name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{u.display_name}</p>
                    <p className="text-xs text-slate-400 font-mono truncate">{u.email}</p>
                  </div>
                  <div className="text-right flex-shrink-0 hidden sm:block">
                    <p className={`text-sm font-bold ${u.total_points > 0 ? 'text-green-600' : u.total_points < 0 ? 'text-red-500' : 'text-slate-400'}`}>
                      {u.total_points} pts
                    </p>
                    <p className="text-xs text-slate-400">
                      {u.last_sign_in_at ? `Đăng nhập ${new Date(u.last_sign_in_at).toLocaleDateString('vi')}` : 'Chưa đăng nhập'}
                    </p>
                  </div>
                  <div className="flex gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => { setResetUser(u); setNewPassword(genPassword()) }}
                      className="text-xs bg-amber-100 hover:bg-amber-200 text-amber-700 px-2.5 py-1.5 rounded-md font-medium transition-colors"
                    >
                      Đổi MK
                    </button>
                    <button
                      onClick={() => setDeleteUser(u)}
                      className="text-xs bg-red-50 hover:bg-red-100 text-red-600 px-2.5 py-1.5 rounded-md font-medium transition-colors"
                    >
                      Xóa
                    </button>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Reset password modal */}
      {resetUser && (
        <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setResetUser(null)}>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl p-6 w-full max-w-sm"
            onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-slate-800 mb-1">Đổi mật khẩu</h2>
            <p className="text-sm text-slate-500 mb-4">{resetUser.display_name} · {resetUser.email}</p>
            <div className="flex gap-2 mb-4">
              <input
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                className="flex-1 border border-slate-300 rounded-lg px-3 py-2.5 text-slate-800 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
              <button onClick={() => setNewPassword(genPassword())}
                className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 px-3 py-2 rounded-lg">
                Tạo mới
              </button>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setResetUser(null)}
                className="flex-1 border border-slate-300 hover:bg-slate-50 text-slate-700 py-2.5 rounded-lg text-sm">
                Hủy
              </button>
              <button onClick={resetPassword} disabled={resetting || !newPassword.trim()}
                className="flex-1 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg text-sm">
                {resetting ? 'Đang lưu...' : 'Lưu mật khẩu'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm modal */}
      {deleteUser && (
        <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setDeleteUser(null)}>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl p-6 w-full max-w-sm"
            onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-slate-800 mb-1">Xóa tài khoản?</h2>
            <p className="text-sm text-slate-500 mb-1">{deleteUser.display_name}</p>
            <p className="text-xs font-mono text-slate-400 mb-4">{deleteUser.email}</p>
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">
              Hành động này không thể hoàn tác. Dự đoán và điểm của tài khoản sẽ bị xóa.
            </p>
            <div className="flex gap-2">
              <button onClick={() => setDeleteUser(null)}
                className="flex-1 border border-slate-300 hover:bg-slate-50 text-slate-700 py-2.5 rounded-lg text-sm">
                Hủy
              </button>
              <button onClick={confirmDelete} disabled={deleting}
                className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg text-sm">
                {deleting ? 'Đang xóa...' : 'Xóa tài khoản'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

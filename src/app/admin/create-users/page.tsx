'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuthStore } from '@/store/auth'

interface UserResult {
  name: string
  email: string
  password: string
  status: 'created' | 'error'
  error?: string
}

export default function CreateUsersPage() {
  const { user, init, loading } = useAuthStore()
  const router = useRouter()

  const [names, setNames] = useState('')
  const [domain, setDomain] = useState('wc.88')
  const [creating, setCreating] = useState(false)
  const [results, setResults] = useState<UserResult[]>([])
  const [summary, setSummary] = useState<{ created: number; failed: number } | null>(null)
  const [error, setError] = useState('')

  useEffect(() => { init() }, [init])
  useEffect(() => { if (!loading && (!user || user.role !== 'admin')) router.replace('/') }, [user, loading, router])

  async function handleCreate() {
    const nameList = names.split('\n').map(n => n.trim()).filter(Boolean)
    if (nameList.length === 0) { setError('Nhập ít nhất một tên'); return }
    if (nameList.length > 200) { setError('Tối đa 200 người mỗi lần'); return }

    setCreating(true)
    setError('')
    setResults([])
    setSummary(null)

    const res = await fetch('/api/admin/create-users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ names: nameList, email_domain: domain }),
    })
    const json = await res.json()

    if (!res.ok) {
      setError(json.message ?? 'Lỗi tạo tài khoản')
    } else {
      setResults(json.results ?? [])
      setSummary({ created: json.created, failed: json.failed })
    }
    setCreating(false)
  }

  function exportJson() {
    const data = results.filter(r => r.status === 'created').map(r => ({
      name: r.name,
      email: r.email,
      password: r.password,
    }))
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `accounts-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  function exportCsv() {
    const rows = ['Tên,Email,Mật khẩu']
    results.filter(r => r.status === 'created').forEach(r => {
      rows.push(`"${r.name}","${r.email}","${r.password}"`)
    })
    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `accounts-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) return <div className="h-48 bg-white rounded-xl border border-slate-200 animate-pulse" />

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/admin" className="text-sm text-slate-500 hover:text-slate-700">← Admin</Link>
        <h1 className="text-2xl font-bold text-slate-800">Tạo tài khoản hàng loạt</h1>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
        <div>
          <label className="text-sm font-medium text-slate-700 block mb-1.5">
            Danh sách tên <span className="text-slate-400 font-normal">(mỗi tên một dòng)</span>
          </label>
          <textarea
            value={names}
            onChange={e => setNames(e.target.value)}
            rows={10}
            placeholder={"Nguyễn Văn A\nTrần Thị B\nLê Văn C"}
            className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-slate-800 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-green-500 resize-y"
          />
          <p className="text-xs text-slate-400 mt-1">
            {names.split('\n').filter(n => n.trim()).length} tên · tối đa 200
          </p>
        </div>

        <div>
          <label className="text-sm font-medium text-slate-700 block mb-1.5">Email domain</label>
          <div className="flex items-center gap-2">
            <span className="text-slate-400 text-sm">username@</span>
            <input
              value={domain}
              onChange={e => setDomain(e.target.value)}
              className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          <p className="text-xs text-slate-400 mt-1">Ví dụ: email sẽ là nguyenVanA@{domain}</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{error}</div>
        )}

        <button
          onClick={handleCreate}
          disabled={creating || !names.trim()}
          className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold py-3 rounded-lg transition-colors"
        >
          {creating ? 'Đang tạo...' : `Tạo ${names.split('\n').filter(n => n.trim()).length} tài khoản`}
        </button>
      </div>

      {summary && (
        <div className={`rounded-xl border px-5 py-4 flex items-center justify-between ${
          summary.failed === 0 ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'
        }`}>
          <div>
            <p className="font-semibold text-slate-800">
              Tạo thành công <span className="text-green-700">{summary.created}</span> tài khoản
              {summary.failed > 0 && <span className="text-red-600 ml-2">· {summary.failed} lỗi</span>}
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={exportCsv} className="text-sm bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-3 py-1.5 rounded-lg font-medium">
              Export CSV
            </button>
            <button onClick={exportJson} className="text-sm bg-slate-800 hover:bg-slate-900 text-white px-3 py-1.5 rounded-lg font-medium">
              Export JSON
            </button>
          </div>
        </div>
      )}

      {results.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
            <h2 className="text-sm font-semibold text-slate-700">Kết quả</h2>
          </div>
          <div className="divide-y divide-slate-50 max-h-96 overflow-y-auto">
            {results.map((r, i) => (
              <div key={i} className={`px-4 py-3 flex items-center justify-between gap-3 ${r.status === 'error' ? 'bg-red-50' : ''}`}>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{r.name}</p>
                  <p className="text-xs text-slate-500 font-mono truncate">{r.email}</p>
                  {r.status === 'error' && <p className="text-xs text-red-500 mt-0.5">{r.error}</p>}
                </div>
                {r.status === 'created' ? (
                  <code className="text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded font-mono flex-shrink-0">
                    {r.password}
                  </code>
                ) : (
                  <span className="text-xs text-red-500 flex-shrink-0">Lỗi</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

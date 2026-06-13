'use client'
import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth'

interface Group { id: string; name: string; invite_code: string; owner_id: string }

export default function JoinGroupPage() {
  const { user, init, loading } = useAuthStore()
  const router = useRouter()
  const params = useSearchParams()
  const code = params.get('code')?.toUpperCase() ?? ''

  const supabase = createClient()
  const [group, setGroup] = useState<Group | null>(null)
  const [memberCount, setMemberCount] = useState(0)
  const [fetching, setFetching] = useState(true)
  const [joining, setJoining] = useState(false)
  const [alreadyMember, setAlreadyMember] = useState(false)
  const [pending, setPending] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { init() }, [init])
  useEffect(() => { if (!loading && !user) router.replace(`/login?redirect=/groups/join?code=${code}`) }, [user, loading])

  useEffect(() => {
    if (!user || !code) { setFetching(false); return }

    async function load() {
      // Lookup group by invite_code
      const { data: g } = await supabase
        .from('groups')
        .select('id, name, invite_code, owner_id')
        .eq('invite_code', code)
        .maybeSingle()

      if (!g) { setFetching(false); return }
      setGroup(g)

      // Member count (approved only)
      const { count } = await supabase
        .from('group_members')
        .select('*', { count: 'exact', head: true })
        .eq('group_id', g.id)
        .eq('status', 'approved')
      setMemberCount(count ?? 0)

      // Check if already member or pending
      const { data: existing } = await supabase
        .from('group_members')
        .select('status')
        .eq('group_id', g.id)
        .eq('user_id', user.id)
        .maybeSingle()

      if (existing?.status === 'approved') setAlreadyMember(true)
      if (existing?.status === 'pending') setPending(true)

      setFetching(false)
    }
    load()
  }, [user, code])

  async function requestJoin() {
    if (!group || !user) return
    setJoining(true)
    setError('')

    const { error: err } = await supabase
      .from('group_members')
      .insert({ group_id: group.id, user_id: user.id, status: 'pending' })

    if (err) {
      if (err.code === '23505') { setAlreadyMember(true) }
      else setError(err.message)
    } else {
      setDone(true)
      setPending(true)
    }
    setJoining(false)
  }

  if (loading || fetching) {
    return (
      <div className="max-w-sm mx-auto mt-20 space-y-3">
        <div className="h-8 w-40 bg-slate-200 rounded animate-pulse mx-auto" />
        <div className="h-32 bg-white rounded-2xl border border-slate-200 animate-pulse" />
      </div>
    )
  }

  if (!code) {
    return (
      <div className="max-w-sm mx-auto mt-20 text-center space-y-4">
        <p className="text-slate-500">Link không hợp lệ — thiếu mã nhóm.</p>
        <Link href="/groups" className="text-green-600 hover:underline text-sm">Về trang nhóm</Link>
      </div>
    )
  }

  if (!group) {
    return (
      <div className="max-w-sm mx-auto mt-20 text-center space-y-4">
        <p className="text-4xl">🔍</p>
        <p className="text-slate-700 font-semibold">Không tìm thấy nhóm</p>
        <p className="text-slate-400 text-sm">Mã <code className="font-mono">{code}</code> không tồn tại hoặc đã bị xóa.</p>
        <Link href="/groups" className="text-green-600 hover:underline text-sm">Về trang nhóm</Link>
      </div>
    )
  }

  return (
    <div className="max-w-sm mx-auto mt-16 space-y-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-green-100 flex items-center justify-center text-3xl mx-auto">👥</div>
        <div>
          <h1 className="text-xl font-bold text-slate-800">{group.name}</h1>
          <p className="text-sm text-slate-400 mt-1 font-mono">#{group.invite_code} · {memberCount} thành viên</p>
        </div>

        {alreadyMember && (
          <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-700">
            Bạn đã là thành viên của nhóm này.
          </div>
        )}

        {pending && !alreadyMember && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-700">
            Yêu cầu tham gia đã được gửi. Chờ trưởng nhóm duyệt.
          </div>
        )}

        {done && (
          <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-700">
            ✓ Đã gửi yêu cầu tham gia! Trưởng nhóm sẽ duyệt sớm.
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">{error}</div>
        )}

        {!alreadyMember && !pending && !done && (
          <button
            onClick={requestJoin}
            disabled={joining}
            className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors"
          >
            {joining ? 'Đang gửi...' : 'Xin tham gia nhóm'}
          </button>
        )}

        {(alreadyMember || pending || done) && (
          <Link href="/groups" className="block w-full border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium py-3 rounded-xl text-sm text-center transition-colors">
            {alreadyMember ? 'Vào trang nhóm' : 'Về trang nhóm'}
          </Link>
        )}
      </div>
    </div>
  )
}

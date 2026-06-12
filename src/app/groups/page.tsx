'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth'

interface Group { id: string; name: string; invite_code: string; owner_id: string }
interface Member { user_id: string; profiles: { display_name: string; total_points: number } }

export default function GroupsPage() {
  const { user, init, loading } = useAuthStore()
  const router = useRouter()
  const supabase = createClient()
  const [groups, setGroups] = useState<Group[]>([])
  const [activeGroup, setActiveGroup] = useState<Group | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [fetching, setFetching] = useState(true)
  const [newName, setNewName] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [msg, setMsg] = useState('')
  const [creating, setCreating] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [showJoin, setShowJoin] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => { init() }, [init])
  useEffect(() => { if (!loading && !user) router.replace('/login') }, [user, loading, router])

  const loadGroups = async () => {
    if (!user) return
    const { data } = await supabase
      .from('group_members')
      .select('group_id, groups(id, name, invite_code, owner_id)')
      .eq('user_id', user.id)
    const list = (data ?? []).map((r: { groups: Group }) => r.groups).filter(Boolean)
    setGroups(list)
    if (list.length > 0 && !activeGroup) { setActiveGroup(list[0]); loadMembers(list[0].id) }
    setFetching(false)
  }

  const loadMembers = async (groupId: string) => {
    const { data } = await supabase
      .from('group_members')
      .select('user_id, profiles(display_name, total_points)')
      .eq('group_id', groupId)
      .order('profiles(total_points)', { ascending: false })
    setMembers((data ?? []) as Member[])
  }

  useEffect(() => { if (user) loadGroups() }, [user])

  async function createGroup() {
    if (!newName.trim()) return
    setCreating(true)
    const { data: group, error } = await supabase.from('groups')
      .insert({ name: newName.trim(), owner_id: user!.id })
      .select().maybeSingle()
    if (!error && group) {
      await supabase.from('group_members').insert({ group_id: group.id, user_id: user!.id })
      await loadGroups()
      setActiveGroup(group)
      loadMembers(group.id)
      setShowCreate(false)
      setNewName('')
    }
    setCreating(false)
  }

  async function joinGroup() {
    const code = joinCode.trim().toUpperCase()
    if (!code) return
    setCreating(true)
    const { data: group } = await supabase.from('groups').select('*').eq('invite_code', code).maybeSingle()
    if (!group) { setMsg('Không tìm thấy nhóm với mã này'); setCreating(false); return }
    const { error } = await supabase.from('group_members').insert({ group_id: group.id, user_id: user!.id })
    if (error?.code === '23505') { setMsg('Bạn đã trong nhóm này rồi') }
    else if (!error) { await loadGroups(); setActiveGroup(group); loadMembers(group.id); setShowJoin(false); setJoinCode('') }
    setCreating(false)
  }

  function copyInvite(code: string) {
    navigator.clipboard.writeText(`Tham gia nhóm WorldCup Predict! Mã: ${code} — ${location.origin}/groups`)
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  const medals = ['🥇', '🥈', '🥉']

  if (loading || fetching) return (
    <div className="space-y-3">{[...Array(3)].map((_, i) => (
      <div key={i} className="h-20 bg-white rounded-xl border border-slate-200 animate-pulse" />
    ))}</div>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Nhóm của tôi</h1>
          <p className="text-slate-500 text-sm mt-0.5">Thi đấu cùng đồng nghiệp</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowJoin(true)}
            className="text-sm border border-slate-300 hover:bg-slate-50 text-slate-700 px-3 py-2 rounded-lg font-medium">
            Tham gia
          </button>
          <button onClick={() => setShowCreate(true)}
            className="text-sm bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg font-medium">
            + Tạo nhóm
          </button>
        </div>
      </div>

      {msg && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">{msg}</div>}

      {groups.length === 0 ? (
        <div className="text-center bg-white rounded-2xl border border-slate-200 py-16">
          <p className="text-4xl mb-3">👥</p>
          <p className="text-slate-600 font-medium">Bạn chưa có nhóm nào</p>
          <p className="text-slate-400 text-sm mt-1">Tạo nhóm mới hoặc nhập mã để tham gia</p>
          <div className="flex gap-2 justify-center mt-4">
            <button onClick={() => setShowJoin(true)} className="border border-slate-300 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-50">Nhập mã tham gia</button>
            <button onClick={() => setShowCreate(true)} className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700">Tạo nhóm</button>
          </div>
        </div>
      ) : (
        <div className="grid sm:grid-cols-3 gap-4">
          {/* Group list */}
          <div className="space-y-2">
            {groups.map(g => (
              <button key={g.id} onClick={() => { setActiveGroup(g); loadMembers(g.id) }}
                className={`w-full text-left p-3 rounded-xl border transition-all ${
                  activeGroup?.id === g.id
                    ? 'border-green-400 bg-green-50'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}>
                <div className="font-medium text-slate-800 text-sm">{g.name}</div>
                <div className="text-xs text-slate-400 mt-0.5 font-mono">#{g.invite_code}</div>
              </button>
            ))}
          </div>

          {/* Leaderboard */}
          {activeGroup && (
            <div className="sm:col-span-2 bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <div>
                  <span className="font-semibold text-slate-800">{activeGroup.name}</span>
                  <span className="ml-2 text-xs text-slate-400 font-mono">#{activeGroup.invite_code}</span>
                </div>
                <button onClick={() => copyInvite(activeGroup.invite_code)}
                  className="text-xs bg-green-100 hover:bg-green-200 text-green-700 px-3 py-1.5 rounded-lg font-medium transition-colors">
                  {copied ? '✓ Đã copy!' : '📋 Copy link mời'}
                </button>
              </div>
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left text-xs text-slate-400 font-semibold px-4 py-2">#</th>
                    <th className="text-left text-xs text-slate-400 font-semibold px-4 py-2">Thành viên</th>
                    <th className="text-right text-xs text-slate-400 font-semibold px-4 py-2">Điểm</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {members.sort((a, b) => (b.profiles?.total_points ?? 0) - (a.profiles?.total_points ?? 0))
                    .map((m, i) => (
                    <tr key={m.user_id} className={`${m.user_id === user?.id ? 'bg-green-50' : 'hover:bg-slate-50'}`}>
                      <td className="px-4 py-3 text-sm">{i < 3 ? medals[i] : i + 1}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center text-xs font-bold text-green-700">
                            {m.profiles?.display_name?.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-sm text-slate-800 font-medium">{m.profiles?.display_name}</span>
                          {m.user_id === user?.id && <span className="text-xs text-green-600 bg-green-100 px-1.5 py-0.5 rounded">bạn</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-green-600">{m.profiles?.total_points ?? 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowCreate(false)}>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-slate-800 mb-4">Tạo nhóm mới</h2>
            <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Tên nhóm (vd: Team Dev)"
              className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-green-500 mb-3" />
            <div className="flex gap-2">
              <button onClick={() => setShowCreate(false)} className="flex-1 border border-slate-300 text-slate-700 py-2.5 rounded-lg text-sm">Hủy</button>
              <button onClick={createGroup} disabled={creating || !newName.trim()}
                className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg text-sm">
                {creating ? 'Đang tạo...' : 'Tạo nhóm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Join modal */}
      {showJoin && (
        <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowJoin(false)}>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-slate-800 mb-4">Tham gia nhóm</h2>
            <input value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase())} placeholder="Nhập mã (vd: AB1234)"
              className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-slate-800 font-mono text-center text-lg tracking-widest focus:outline-none focus:ring-2 focus:ring-green-500 mb-3" />
            {msg && <p className="text-red-500 text-sm mb-3">{msg}</p>}
            <div className="flex gap-2">
              <button onClick={() => { setShowJoin(false); setMsg('') }} className="flex-1 border border-slate-300 text-slate-700 py-2.5 rounded-lg text-sm">Hủy</button>
              <button onClick={joinGroup} disabled={creating || !joinCode.trim()}
                className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg text-sm">
                {creating ? 'Đang tham gia...' : 'Tham gia'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

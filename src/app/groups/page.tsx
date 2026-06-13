'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth'

interface Group { id: string; name: string; invite_code: string; owner_id: string }
interface Member {
  user_id: string
  status: 'pending' | 'approved'
  profiles: { display_name: string; total_points: number }
}

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
  useEffect(() => {
    if (!loading && !user) router.replace('/login')
  }, [user, loading, router])

  const loadGroups = async () => {
    if (!user) return
    const { data } = await supabase
      .from('group_members')
      .select('group_id, status, groups(id, name, invite_code, owner_id)')
      .eq('user_id', user.id)
      .eq('status', 'approved')
    const list = (data ?? []).map((r: { groups: Group }) => r.groups).filter(Boolean)
    setGroups(list)
    if (list.length > 0 && !activeGroup) {
      setActiveGroup(list[0])
      loadMembers(list[0].id)
    }
    setFetching(false)
  }

  const loadMembers = async (groupId: string) => {
    const { data } = await supabase
      .from('group_members')
      .select('user_id, status, profiles(display_name, total_points)')
      .eq('group_id', groupId)
      .order('status')
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
      // Owner is auto-approved
      await supabase.from('group_members').insert({ group_id: group.id, user_id: user!.id, status: 'approved' })
      await loadGroups()
      setActiveGroup(group)
      loadMembers(group.id)
      setShowCreate(false)
      setNewName('')
    }
    setCreating(false)
  }

  async function joinByCode() {
    const code = joinCode.trim().toUpperCase()
    if (!code) return
    setCreating(true)
    setMsg('')
    const { data: group } = await supabase.from('groups').select('*').eq('invite_code', code).maybeSingle()
    if (!group) { setMsg('Không tìm thấy nhóm với mã này'); setCreating(false); return }

    const { error } = await supabase.from('group_members')
      .insert({ group_id: group.id, user_id: user!.id, status: 'pending' })

    if (error?.code === '23505') {
      setMsg('Bạn đã gửi yêu cầu hoặc đã trong nhóm này rồi')
    } else if (!error) {
      setMsg(`✓ Đã gửi yêu cầu tham gia "${group.name}". Chờ trưởng nhóm duyệt.`)
      setShowJoin(false)
      setJoinCode('')
    } else {
      setMsg(error.message)
    }
    setCreating(false)
  }

  async function approveRequest(groupId: string, userId: string) {
    await supabase.from('group_members')
      .update({ status: 'approved' })
      .eq('group_id', groupId)
      .eq('user_id', userId)
    setMembers(prev => prev.map(m =>
      m.user_id === userId ? { ...m, status: 'approved' } : m
    ))
  }

  async function rejectRequest(groupId: string, userId: string) {
    await supabase.from('group_members')
      .delete()
      .eq('group_id', groupId)
      .eq('user_id', userId)
    setMembers(prev => prev.filter(m => m.user_id !== userId))
  }

  async function removeMember(groupId: string, userId: string) {
    await supabase.from('group_members')
      .delete()
      .eq('group_id', groupId)
      .eq('user_id', userId)
    setMembers(prev => prev.filter(m => m.user_id !== userId))
  }

  function copyInviteLink(code: string) {
    const link = `${location.origin}/groups/join?code=${code}`
    navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const medals = ['🥇', '🥈', '🥉']
  const isOwner = (g: Group) => g.owner_id === user?.id
  const isAdmin = user?.role === 'admin'
  const canManage = activeGroup && (isOwner(activeGroup) || isAdmin)

  const approvedMembers = members.filter(m => m.status === 'approved')
    .sort((a, b) => (b.profiles?.total_points ?? 0) - (a.profiles?.total_points ?? 0))
  const pendingMembers = members.filter(m => m.status === 'pending')

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
          <p className="text-slate-500 text-sm mt-0.5">Thi đấu cùng bạn bè</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowJoin(true)}
            className="text-sm border border-slate-300 hover:bg-slate-50 text-slate-700 px-3 py-2 rounded-lg font-medium">
            Nhập mã
          </button>
          <button onClick={() => setShowCreate(true)}
            className="text-sm bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg font-medium">
            + Tạo nhóm
          </button>
        </div>
      </div>

      {msg && (
        <div className={`text-sm rounded-lg px-4 py-2 border ${
          msg.startsWith('✓')
            ? 'bg-green-50 text-green-700 border-green-200'
            : 'bg-red-50 text-red-600 border-red-200'
        }`}>{msg}</div>
      )}

      {groups.length === 0 ? (
        <div className="text-center bg-white rounded-2xl border border-slate-200 py-16">
          <p className="text-4xl mb-3">👥</p>
          <p className="text-slate-600 font-medium">Bạn chưa có nhóm nào</p>
          <p className="text-slate-400 text-sm mt-1">Tạo nhóm mới hoặc nhập mã để tham gia</p>
          <div className="flex gap-2 justify-center mt-4">
            <button onClick={() => setShowJoin(true)}
              className="border border-slate-300 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-50">
              Nhập mã tham gia
            </button>
            <button onClick={() => setShowCreate(true)}
              className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700">
              Tạo nhóm
            </button>
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
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-xs text-slate-400 font-mono">#{g.invite_code}</span>
                  {g.owner_id === user?.id && (
                    <span className="text-[10px] bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded font-medium">Trưởng</span>
                  )}
                </div>
              </button>
            ))}
          </div>

          {/* Members panel */}
          {activeGroup && (
            <div className="sm:col-span-2 bg-white rounded-xl border border-slate-200 overflow-hidden">
              {/* Panel header */}
              <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <div>
                  <span className="font-semibold text-slate-800">{activeGroup.name}</span>
                  <span className="ml-2 text-xs text-slate-400 font-mono">#{activeGroup.invite_code}</span>
                </div>
                <button onClick={() => copyInviteLink(activeGroup.invite_code)}
                  className="text-xs bg-green-100 hover:bg-green-200 text-green-700 px-3 py-1.5 rounded-lg font-medium transition-colors">
                  {copied ? '✓ Đã copy!' : '🔗 Copy link mời'}
                </button>
              </div>

              {/* Pending requests — only visible to owner/admin */}
              {canManage && pendingMembers.length > 0 && (
                <div className="px-4 py-3 border-b border-amber-100 bg-amber-50">
                  <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-2">
                    Chờ duyệt · {pendingMembers.length}
                  </p>
                  <div className="space-y-2">
                    {pendingMembers.map(m => (
                      <div key={m.user_id} className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-amber-100 flex items-center justify-center text-xs font-bold text-amber-700 flex-shrink-0">
                          {m.profiles?.display_name?.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-sm text-slate-700 flex-1 font-medium">{m.profiles?.display_name}</span>
                        <button onClick={() => approveRequest(activeGroup.id, m.user_id)}
                          className="text-xs bg-green-600 hover:bg-green-700 text-white px-2.5 py-1 rounded-md font-medium transition-colors">
                          Duyệt
                        </button>
                        <button onClick={() => rejectRequest(activeGroup.id, m.user_id)}
                          className="text-xs bg-red-100 hover:bg-red-200 text-red-600 px-2.5 py-1 rounded-md font-medium transition-colors">
                          Từ chối
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Approved leaderboard */}
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left text-xs text-slate-400 font-semibold px-4 py-2">#</th>
                    <th className="text-left text-xs text-slate-400 font-semibold px-4 py-2">Thành viên</th>
                    <th className="text-right text-xs text-slate-400 font-semibold px-4 py-2">Điểm</th>
                    {canManage && <th className="px-4 py-2" />}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {approvedMembers.map((m, i) => (
                    <tr key={m.user_id} className={m.user_id === user?.id ? 'bg-green-50' : 'hover:bg-slate-50'}>
                      <td className="px-4 py-3 text-sm">{i < 3 ? medals[i] : i + 1}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center text-xs font-bold text-green-700">
                            {m.profiles?.display_name?.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-sm text-slate-800 font-medium">{m.profiles?.display_name}</span>
                          {m.user_id === user?.id && (
                            <span className="text-xs text-green-600 bg-green-100 px-1.5 py-0.5 rounded">bạn</span>
                          )}
                          {activeGroup.owner_id === m.user_id && (
                            <span className="text-xs text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded">trưởng</span>
                          )}
                        </div>
                      </td>
                      <td className={`px-4 py-3 text-right font-bold ${
                        (m.profiles?.total_points ?? 0) < 0 ? 'text-red-500' :
                        (m.profiles?.total_points ?? 0) > 0 ? 'text-green-600' : 'text-slate-400'
                      }`}>
                        {m.profiles?.total_points ?? 0}
                      </td>
                      {canManage && (
                        <td className="px-4 py-3 text-right">
                          {m.user_id !== user?.id && (
                            <button onClick={() => removeMember(activeGroup.id, m.user_id)}
                              className="text-xs text-slate-400 hover:text-red-500 transition-colors">
                              Xóa
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
              {approvedMembers.length === 0 && (
                <div className="text-center text-slate-400 text-sm py-8">Chưa có thành viên nào được duyệt</div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowCreate(false)}>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl p-6 w-full max-w-sm"
            onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-slate-800 mb-4">Tạo nhóm mới</h2>
            <input value={newName} onChange={e => setNewName(e.target.value)}
              placeholder="Tên nhóm (vd: Team Dev)"
              className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-green-500 mb-3" />
            <div className="flex gap-2">
              <button onClick={() => setShowCreate(false)}
                className="flex-1 border border-slate-300 text-slate-700 py-2.5 rounded-lg text-sm">Hủy</button>
              <button onClick={createGroup} disabled={creating || !newName.trim()}
                className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg text-sm">
                {creating ? 'Đang tạo...' : 'Tạo nhóm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Join by code modal */}
      {showJoin && (
        <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => { setShowJoin(false); setMsg('') }}>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl p-6 w-full max-w-sm"
            onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-slate-800 mb-1">Tham gia nhóm</h2>
            <p className="text-sm text-slate-400 mb-4">Nhập mã 6 ký tự hoặc dùng link được gửi cho bạn</p>
            <input value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase())}
              placeholder="VD: AB1234"
              className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-slate-800 font-mono text-center text-lg tracking-widest focus:outline-none focus:ring-2 focus:ring-green-500 mb-3" />
            {msg && <p className={`text-sm mb-3 ${msg.startsWith('✓') ? 'text-green-600' : 'text-red-500'}`}>{msg}</p>}
            <div className="flex gap-2">
              <button onClick={() => { setShowJoin(false); setMsg('') }}
                className="flex-1 border border-slate-300 text-slate-700 py-2.5 rounded-lg text-sm">Hủy</button>
              <button onClick={joinByCode} disabled={creating || !joinCode.trim()}
                className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg text-sm">
                {creating ? 'Đang gửi...' : 'Gửi yêu cầu'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

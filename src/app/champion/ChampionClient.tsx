'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth'
import FlagImg from '@/components/FlagImg'

interface Team { name: string; flag: string | null }
interface Props { teams: Team[]; pickCount: Record<string, number> }

// Confederation mapping — no duplicate keys
const CONF: Record<string, string> = {
  // UEFA (16)
  Germany: 'UEFA', England: 'UEFA', Spain: 'UEFA', France: 'UEFA',
  Italy: 'UEFA', Portugal: 'UEFA', Netherlands: 'UEFA', Belgium: 'UEFA',
  Croatia: 'UEFA', Switzerland: 'UEFA', Denmark: 'UEFA', Austria: 'UEFA',
  Scotland: 'UEFA', Serbia: 'UEFA', Poland: 'UEFA', Slovakia: 'UEFA',
  Slovenia: 'UEFA', Ukraine: 'UEFA', Hungary: 'UEFA', Turkey: 'UEFA',
  Romania: 'UEFA', Norway: 'UEFA', Sweden: 'UEFA', Greece: 'UEFA',
  'Czech Republic': 'UEFA', 'Bosnia & Herzegovina': 'UEFA',
  // CONMEBOL (6)
  Brazil: 'CONMEBOL', Argentina: 'CONMEBOL', Uruguay: 'CONMEBOL',
  Colombia: 'CONMEBOL', Ecuador: 'CONMEBOL', Venezuela: 'CONMEBOL',
  Paraguay: 'CONMEBOL', Chile: 'CONMEBOL', Bolivia: 'CONMEBOL', Peru: 'CONMEBOL',
  // CONCACAF (6)
  USA: 'CONCACAF', Mexico: 'CONCACAF', Canada: 'CONCACAF',
  Jamaica: 'CONCACAF', Honduras: 'CONCACAF', Panama: 'CONCACAF',
  'Costa Rica': 'CONCACAF', Guatemala: 'CONCACAF', Haiti: 'CONCACAF',
  'Trinidad & Tobago': 'CONCACAF', 'Curaçao': 'CONCACAF', Curacao: 'CONCACAF',
  // AFC (8)
  Japan: 'AFC', 'South Korea': 'AFC', Iran: 'AFC', Australia: 'AFC',
  'Saudi Arabia': 'AFC', Qatar: 'AFC', Iraq: 'AFC', China: 'AFC',
  Indonesia: 'AFC', Jordan: 'AFC', Uzbekistan: 'AFC',
  // CAF (9)
  Morocco: 'CAF', Nigeria: 'CAF', Senegal: 'CAF', Egypt: 'CAF',
  Cameroon: 'CAF', 'DR Congo': 'CAF', Ghana: 'CAF', 'Ivory Coast': 'CAF',
  'South Africa': 'CAF', Kenya: 'CAF', Algeria: 'CAF', Mali: 'CAF',
  Tunisia: 'CAF', Angola: 'CAF', 'Cape Verde': 'CAF',
  // OFC (1)
  'New Zealand': 'OFC',
}

const CONF_LABELS: Record<string, string> = {
  all: 'Tất cả',
  UEFA: 'UEFA',
  CONMEBOL: 'CONMEBOL',
  CONCACAF: 'CONCACAF',
  AFC: 'AFC',
  CAF: 'CAF',
  OFC: 'OFC',
}

export default function ChampionClient({ teams, pickCount }: Props) {
  const { user, init, loading } = useAuthStore()
  const router = useRouter()
  const supabase = createClient()

  const [myPick, setMyPick] = useState<string | null>(null)
  const [livePickCount, setLivePickCount] = useState<Record<string, number>>(pickCount)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [search, setSearch] = useState('')
  const [confFilter, setConfFilter] = useState('all')

  useEffect(() => { init() }, [init])
  useEffect(() => {
    if (!loading && !user) router.replace('/login')
  }, [user, loading, router])

  useEffect(() => {
    if (!user) return
    supabase
      .from('champion_picks')
      .select('team_name')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }: { data: { team_name: string } | null }) => {
        if (data) setMyPick(data.team_name)
        setFetching(false)
      })
  }, [user])

  const isAdmin = user?.role === 'admin'

  async function savePick(team: string) {
    if (saving || team === myPick || isAdmin) return
    const prevPick = myPick   // capture before any await

    // Optimistic update immediately — before network call
    setMyPick(team)
    setLivePickCount(prev => {
      const next = { ...prev }
      if (prevPick) next[prevPick] = Math.max(0, (next[prevPick] ?? 0) - 1)
      next[team] = (next[team] ?? 0) + 1
      return next
    })

    setSaving(true)
    const { error } = await supabase
      .from('champion_picks')
      .upsert({ user_id: user!.id, team_name: team }, { onConflict: 'user_id' })

    if (error) {
      // Rollback on failure
      setMyPick(prevPick)
      setLivePickCount(prev => {
        const next = { ...prev }
        next[team] = Math.max(0, (next[team] ?? 0) - 1)
        if (prevPick) next[prevPick] = (next[prevPick] ?? 0) + 1
        return next
      })
    } else {
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    }
    setSaving(false)
  }

  // Get confederations that actually exist in the team list
  const availableConfs = ['all', ...Array.from(new Set(
    teams.map(t => CONF[t.name]).filter(Boolean)
  )).sort()]

  const filtered = teams.filter(t => {
    const matchSearch = t.name.toLowerCase().includes(search.toLowerCase())
    const matchConf = confFilter === 'all' || CONF[t.name] === confFilter
    return matchSearch && matchConf
  })

  // Top picks sorted
  const topPicks = Object.entries(livePickCount)
    .filter(([, count]) => (count as number) > 0)
    .sort(([, a], [, b]) => (b as number) - (a as number))
    .slice(0, 5)

  if (loading || fetching) {
    return (
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="h-8 w-48 bg-slate-200 rounded animate-pulse" />
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {[...Array(9)].map((_, i) => (
            <div key={i} className="h-14 bg-white rounded-xl border border-slate-200 animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (teams.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-4xl mb-3">⚽</p>
        <p className="text-slate-500">Chưa có dữ liệu đội bóng. Vui lòng sync lịch thi đấu trước.</p>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Đoán nhà vô địch</h1>
        {isAdmin ? (
          <div className="mt-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-700 flex items-center gap-2">
            <span>🔒</span> Tài khoản admin chỉ xem — không thể tham gia dự đoán.
          </div>
        ) : (
          <p className="text-slate-500 text-sm mt-1">
            Chọn 1 đội · Đúng: <span className="text-amber-600 font-semibold">+20 điểm</span> thưởng cuối giải
            · {teams.length} đội tham dự
          </p>
        )}
      </div>

      {/* Current pick banner */}
      {myPick && (() => {
        const t = teams.find(t => t.name === myPick)
        return (
          <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
            <FlagImg team={myPick} flag={t?.flag} size="lg" />
            <div className="flex-1 min-w-0">
              <div className="text-xs text-amber-600 font-semibold uppercase tracking-wide">Lựa chọn của bạn</div>
              <div className="text-lg font-bold text-amber-800 truncate">{myPick}</div>
              {livePickCount[myPick] && (
                <div className="text-xs text-amber-600/70">{livePickCount[myPick]} người cùng chọn</div>
              )}
            </div>
            {saved && (
              <span className="text-green-600 text-sm font-semibold flex-shrink-0">✓ Đã lưu</span>
            )}
            <span className="text-2xl flex-shrink-0">★</span>
          </div>
        )
      })()}

      {/* Search + filter */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Tìm kiếm đội bóng..."
            className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-lg leading-none"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Confederation filter tabs */}
      <div className="flex gap-1.5 flex-wrap">
        {availableConfs.map(conf => (
          <button
            key={conf}
            onClick={() => setConfFilter(conf)}
            className={`text-xs font-semibold px-3 py-1.5 rounded-full transition-all ${
              confFilter === conf
                ? 'bg-green-600 text-white shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200 hover:border-green-300 hover:text-green-700'
            }`}
          >
            {CONF_LABELS[conf] ?? conf}
          </button>
        ))}
      </div>

      {/* Results count */}
      {(search || confFilter !== 'all') && (
        <p className="text-sm text-slate-500">
          {filtered.length} đội
          {search && <span> · "<span className="font-medium">{search}</span>"</span>}
          {confFilter !== 'all' && <span> · {CONF_LABELS[confFilter]}</span>}
        </p>
      )}

      {/* Team grid */}
      {filtered.length === 0 ? (
        <div className="text-center bg-white rounded-2xl border border-slate-200 py-12">
          <p className="text-slate-400 text-sm mb-2">Không tìm thấy kết quả</p>
          <p className="text-slate-500 text-sm">Không tìm thấy đội nào</p>
          <button onClick={() => { setSearch(''); setConfFilter('all') }}
            className="text-green-600 hover:underline text-sm mt-2">
            Xóa bộ lọc
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {filtered.map(team => {
            const isSelected = myPick === team.name
            const count = livePickCount[team.name] ?? 0
            const conf = CONF[team.name]
            return (
              <button
                key={team.name}
                onClick={() => savePick(team.name)}
                disabled={saving}
                className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-left group ${
                  isSelected
                    ? 'border-amber-400 bg-amber-50 ring-2 ring-amber-300 shadow-sm'
                    : 'border-slate-200 bg-white hover:border-green-300 hover:bg-green-50 hover:shadow-sm'
                }`}
              >
                <FlagImg team={team.name} flag={team.flag} size="md" />
                <div className="min-w-0 flex-1">
                  <div className={`text-sm font-semibold truncate leading-tight ${
                    isSelected ? 'text-amber-800' : 'text-slate-800'
                  }`}>
                    {team.name}
                  </div>
                  <div className="flex items-center gap-1 mt-0.5">
                    {conf && (
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                        isSelected ? 'bg-amber-200 text-amber-700' : 'bg-slate-100 text-slate-400'
                      }`}>
                        {conf}
                      </span>
                    )}
                    {count > 0 && (
                      <span className="text-[10px] text-slate-400">{count} chọn</span>
                    )}
                  </div>
                </div>
                {isSelected && <span className="text-amber-500 text-base flex-shrink-0">★</span>}
              </button>
            )
          })}
        </div>
      )}

      {/* Top picks */}
      {topPicks.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <h2 className="text-sm font-bold text-slate-600 mb-3">Được chọn nhiều nhất</h2>
          <div className="space-y-2">
            {topPicks.map(([team, count], i) => {
              const t = teams.find(t => t.name === team)
              const total = Object.values(livePickCount).reduce((a: number, b: number) => a + b, 0)
              const pct = total > 0 ? Math.round(((count as number) / total) * 100) : 0
              return (
                <div key={team} className="flex items-center gap-3">
                  <span className="text-xs text-slate-400 w-4 text-right">{i + 1}</span>
                  <FlagImg team={team} flag={t?.flag ?? null} size="sm" />
                  <span className="text-sm text-slate-700 flex-1 font-medium">{team}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-xs text-slate-500 w-12 text-right">{count} người ({pct}%)</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

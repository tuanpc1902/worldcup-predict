'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth'
import { getFlagUrl, getAllTeams } from '@/lib/flag-map'

const WC_TEAMS = [
  'Argentina','Australia','Austria','Belgium','Bolivia','Bosnia & Herzegovina',
  'Brazil','Cameroon','Canada','Chile','China','Colombia','Costa Rica',
  'Croatia','Czech Republic','Denmark','DR Congo','Ecuador','Egypt','England',
  'France','Germany','Ghana','Greece','Guatemala','Haiti','Honduras','Hungary',
  'India','Indonesia','Iran','Iraq','Italy','Ivory Coast','Jamaica','Japan',
  'Jordan','Kenya','Kuwait','Mali','Mexico','Morocco','Netherlands','New Zealand',
  'Nicaragua','Nigeria','Norway','Oman','Palestine','Panama','Paraguay','Peru',
  'Poland','Portugal','Qatar','Romania','Saudi Arabia','Scotland','Senegal',
  'Serbia','Slovakia','Slovenia','South Africa','South Korea','Spain','Sweden',
  'Switzerland','Thailand','Trinidad & Tobago','Tunisia','Turkey','Ukraine',
  'Uruguay','USA','Venezuela','Vietnam','Wales',
]

export default function ChampionPage() {
  const { user, init, loading } = useAuthStore()
  const router = useRouter()
  const supabase = createClient()
  const [pick, setPick] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [allPicks, setAllPicks] = useState<any[]>([])

  useEffect(() => { init() }, [init])
  useEffect(() => { if (!loading && !user) router.replace('/login') }, [user, loading, router])

  useEffect(() => {
    if (!user) return
    Promise.all([
      supabase.from('champion_picks').select('team_name').eq('user_id', user.id).single(),
      supabase.from('champion_picks').select('team_name, profiles(display_name)').order('created_at'),
    ]).then(([{ data: myPick }, { data: picks }]) => {
      if (myPick) setPick(myPick.team_name)
      setAllPicks(picks ?? [])
      setFetching(false)
    })
  }, [user])

  async function savePick(team: string) {
    if (saving) return
    setSaving(true)
    const { error } = await supabase.from('champion_picks')
      .upsert({ user_id: user!.id, team_name: team }, { onConflict: 'user_id' })
    if (!error) { setPick(team); setSaved(true); setTimeout(() => setSaved(false), 2000) }
    setSaving(false)
  }

  const filtered = WC_TEAMS.filter(t => t.toLowerCase().includes(search.toLowerCase()))

  // Count picks per team
  const pickCount: Record<string, number> = {}
  allPicks.forEach(p => { pickCount[p.team_name] = (pickCount[p.team_name] ?? 0) + 1 })

  if (loading || fetching) return (
    <div className="space-y-3">{[...Array(6)].map((_, i) => (
      <div key={i} className="h-16 bg-white rounded-xl border border-slate-200 animate-pulse" />
    ))}</div>
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">🏆 Đoán nhà vô địch</h1>
        <p className="text-slate-500 text-sm mt-1">Chọn 1 đội. Đúng: <span className="text-amber-600 font-semibold">+20 điểm</span> thưởng cuối giải.</p>
      </div>

      {pick && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
          {getFlagUrl(pick) && (
            <img src={getFlagUrl(pick)!} alt={pick} className="w-10 h-7 object-cover rounded shadow-sm" />
          )}
          <div>
            <div className="text-xs text-amber-600 font-medium">Lựa chọn của bạn</div>
            <div className="text-lg font-bold text-amber-800">{pick}</div>
          </div>
          {saved && <span className="ml-auto text-green-600 text-sm font-medium">✓ Đã lưu</span>}
        </div>
      )}

      <input
        type="text"
        placeholder="Tìm đội..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-green-500"
      />

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {filtered.map(team => {
          const flag = getFlagUrl(team)
          const isSelected = pick === team
          const count = pickCount[team] ?? 0
          return (
            <button
              key={team}
              onClick={() => savePick(team)}
              disabled={saving}
              className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                isSelected
                  ? 'border-amber-400 bg-amber-50 ring-2 ring-amber-300'
                  : 'border-slate-200 bg-white hover:border-green-300 hover:bg-green-50'
              }`}
            >
              {flag
                ? <img src={flag} alt={team} className="w-8 h-6 object-cover rounded shadow-sm flex-shrink-0" />
                : <div className="w-8 h-6 bg-slate-200 rounded flex-shrink-0" />
              }
              <div className="min-w-0">
                <div className="text-sm font-medium text-slate-800 truncate">{team}</div>
                {count > 0 && <div className="text-xs text-slate-400">{count} người chọn</div>}
              </div>
              {isSelected && <span className="ml-auto text-amber-500 text-lg">★</span>}
            </button>
          )
        })}
      </div>

      {allPicks.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <h2 className="text-sm font-bold text-slate-600 mb-3">Đội được chọn nhiều nhất</h2>
          <div className="space-y-2">
            {Object.entries(pickCount).sort(([, a], [, b]) => b - a).slice(0, 5).map(([team, count]) => (
              <div key={team} className="flex items-center gap-2">
                {getFlagUrl(team) && <img src={getFlagUrl(team)!} alt={team} className="w-6 h-4 object-cover rounded" />}
                <span className="text-sm text-slate-700 flex-1">{team}</span>
                <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{count} người</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

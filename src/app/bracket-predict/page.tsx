'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth'
import FlagImg from '@/components/FlagImg'
import { getFlagUrl } from '@/lib/flag-map'
import { isPlaceholder } from '@/lib/team-utils'
import type { BracketPrediction } from '@/types'

const ROUNDS = [
  { key: 'round_of_16', label: 'Vong 1/8', slots: 16 },
  { key: 'quarter',     label: 'Tu ket',   slots: 8 },
  { key: 'semi',        label: 'Ban ket',  slots: 4 },
  { key: 'final',       label: 'Chung ket', slots: 2 },
  { key: 'champion',    label: 'Vo dich',  slots: 1 },
] as const

type RoundKey = typeof ROUNDS[number]['key']

interface TeamInfo { name: string; flag: string | null }

export default function BracketPredictPage() {
  const { user, init, loading } = useAuthStore()
  const router = useRouter()
  const supabase = createClient()
  const [teams, setTeams] = useState<TeamInfo[]>([])
  const [preds, setPreds] = useState<Record<string, string[]>>({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [activeRound, setActiveRound] = useState<RoundKey>('round_of_16')

  useEffect(() => { init() }, [init])
  useEffect(() => {
    if (!loading && !user) router.replace('/login')
  }, [user, loading, router])

  useEffect(() => {
    if (!user) return
    Promise.all([
      supabase.from('matches').select('home_team, home_flag, away_team, away_flag'),
      supabase.from('bracket_predictions').select('*').eq('user_id', user.id),
    ]).then(([{ data: matches }, { data: myPreds }]) => {
      const teamMap = new Map<string, string | null>()
      for (const m of matches ?? []) {
        if (m.home_team && !isPlaceholder(m.home_team)) teamMap.set(m.home_team, m.home_flag ?? getFlagUrl(m.home_team))
        if (m.away_team && !isPlaceholder(m.away_team)) teamMap.set(m.away_team, m.away_flag ?? getFlagUrl(m.away_team))
      }
      setTeams(Array.from(teamMap.entries()).map(([name, flag]) => ({ name, flag })).sort((a, b) => a.name.localeCompare(b.name)))

      const map: Record<string, string[]> = {}
      ROUNDS.forEach(r => { map[r.key] = Array(r.slots).fill('') })
      for (const p of (myPreds ?? []) as BracketPrediction[]) {
        if (!map[p.round]) map[p.round] = []
        map[p.round][p.slot] = p.team_name
      }
      setPreds(map)
      setFetching(false)
    })
  }, [user])

  async function saveRound() {
    if (!user || saving) return
    setSaving(true)
    const round = activeRound
    const slots = preds[round] ?? []
    const rows = slots
      .map((team, slot) => ({ user_id: user.id, round, slot, team_name: team }))
      .filter(r => r.team_name.length > 0)

    await supabase.from('bracket_predictions').delete().eq('user_id', user.id).eq('round', round)
    if (rows.length > 0) await supabase.from('bracket_predictions').insert(rows)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  function setSlot(round: string, slot: number, team: string) {
    setPreds(prev => {
      const copy = { ...prev }
      const arr = [...(copy[round] ?? [])]
      arr[slot] = team
      copy[round] = arr
      return copy
    })
  }

  const currentRound = ROUNDS.find(r => r.key === activeRound)!

  if (loading || fetching) return <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-slate-100 rounded-xl animate-pulse" />)}</div>

  return (
    <div className="max-w-2xl mx-auto space-y-5 pb-20 fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Du doan bracket</h1>
        <p className="text-slate-500 text-sm mt-1">Chon cac doi vao tung vong knockout</p>
      </div>

      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl overflow-x-auto">
        {ROUNDS.map(r => (
          <button
            key={r.key}
            onClick={() => setActiveRound(r.key)}
            className={"flex-1 min-w-[70px] text-xs font-semibold px-2 py-2 rounded-lg transition-all " + (activeRound === r.key ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700')}
          >
            {r.label}
          </button>
        ))}
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-slate-700">{currentRound.label} ({currentRound.slots} doi)</h2>
          <button
            onClick={saveRound}
            disabled={saving}
            className={"text-sm font-bold px-4 py-1.5 rounded-xl transition-colors " + (saved ? 'bg-green-100 text-green-700' : 'bg-green-600 hover:bg-green-700 text-white')}
          >
            {saved ? 'Da luu!' : saving ? '...' : 'Luu vong nay'}
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: currentRound.slots }).map((_, slot) => {
            const chosen = preds[activeRound]?.[slot] ?? ''
            const chosenTeam = teams.find(t => t.name === chosen)
            return (
              <div key={slot} className="space-y-1">
                <label className="text-xs text-slate-400 font-medium">Vi tri {slot + 1}</label>
                <div className="flex items-center gap-2 border border-slate-200 rounded-lg px-3 py-2 bg-slate-50">
                  {chosenTeam ? <FlagImg team={chosenTeam.name} flag={chosenTeam.flag} size="xs" /> : <div className="w-[22px] h-[15px] bg-slate-200 rounded flex-shrink-0" />}
                  <select
                    value={chosen}
                    onChange={e => setSlot(activeRound, slot, e.target.value)}
                    className="flex-1 bg-transparent text-sm text-slate-700 outline-none min-w-0"
                  >
                    <option value="">-- Chon doi --</option>
                    {teams.map(t => <option key={t.name} value={t.name}>{t.name}</option>)}
                  </select>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-800">
        Diem thuong: +10 diem moi doi doan dung vao vong 1/8, +15 tu ket, +20 ban ket, +25 chung ket, +30 vo dich
      </div>
    </div>
  )
}

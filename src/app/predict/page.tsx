'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth'
import MatchCard from '@/components/MatchCard'
import type { Match, Prediction } from '@/types'

export default function PredictPage() {
  const { user, init, loading } = useAuthStore()
  const router = useRouter()
  const supabase = createClient()

  const [matches, setMatches] = useState<Match[]>([])
  const [predictions, setPredictions] = useState<Record<string, Prediction>>({})
  const [inputs, setInputs] = useState<Record<string, { home: string; away: string }>>({})
  const [saving, setSaving] = useState<string | null>(null)
  const [saved, setSaved] = useState<string | null>(null)
  const [fetching, setFetching] = useState(true)

  useEffect(() => { init() }, [init])
  useEffect(() => { if (!loading && !user) router.replace('/login') }, [user, loading, router])

  useEffect(() => {
    if (!user) return
    async function load() {
      setFetching(true)
      const [{ data: ms }, { data: ps }] = await Promise.all([
        supabase.from('matches').select('*').in('status', ['scheduled', 'live']).order('match_time', { ascending: true }),
        supabase.from('predictions').select('*').eq('user_id', user!.id),
      ])
      const matchList = ms ?? []
      const predMap: Record<string, Prediction> = {}
      const inputMap: Record<string, { home: string; away: string }> = {}
      ;(ps ?? []).forEach((p: Prediction) => { predMap[p.match_id] = p })
      matchList.forEach((m: Match) => {
        inputMap[m.id] = predMap[m.id]
          ? { home: String(predMap[m.id].predicted_home), away: String(predMap[m.id].predicted_away) }
          : { home: '', away: '' }
      })
      setMatches(matchList)
      setPredictions(predMap)
      setInputs(inputMap)
      setFetching(false)
    }
    load()
  }, [user])

  async function savePrediction(matchId: string) {
    const inp = inputs[matchId]
    if (inp.home === '' || inp.away === '') return
    const h = parseInt(inp.home), a = parseInt(inp.away)
    if (isNaN(h) || isNaN(a) || h < 0 || a < 0) return
    setSaving(matchId)
    const { error } = await supabase.from('predictions').upsert(
      { user_id: user!.id, match_id: matchId, predicted_home: h, predicted_away: a },
      { onConflict: 'user_id,match_id' }
    )
    if (!error) {
      setPredictions(prev => ({ ...prev, [matchId]: { id: '', user_id: user!.id, match_id: matchId, predicted_home: h, predicted_away: a, points_earned: null, scored_at: null, created_at: '' } }))
      setSaved(matchId)
      setTimeout(() => setSaved(null), 2000)
    }
    setSaving(null)
  }

  if (loading || fetching) {
    return <div className="space-y-3">{[...Array(4)].map((_, i) => (
      <div key={i} className="h-32 bg-white rounded-xl border border-slate-200 animate-pulse" />
    ))}</div>
  }

  const unlocked = matches.filter(m => !m.is_locked)
  const locked = matches.filter(m => m.is_locked)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">🎯 Dự đoán</h1>
        <div className="flex gap-4 mt-2">
          <span className="text-xs bg-green-100 text-green-700 px-2.5 py-1 rounded-full font-medium">+5 pts đúng tỉ số</span>
          <span className="text-xs bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full font-medium">+3 pts đúng kết quả</span>
          <span className="text-xs bg-red-100 text-red-700 px-2.5 py-1 rounded-full font-medium">-1 pt sai</span>
        </div>
      </div>

      {unlocked.length === 0 && locked.length === 0 && (
        <div className="text-center bg-white rounded-2xl border border-slate-200 py-20">
          <p className="text-4xl mb-3">📅</p>
          <p className="text-slate-500">Không có trận nào để dự đoán.</p>
        </div>
      )}

      {unlocked.length > 0 && (
        <section className="space-y-3">
          {unlocked.map(match => (
            <div key={match.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4">
                <MatchCard match={match} prediction={predictions[match.id]} />
              </div>
              <div className="px-4 pb-4 flex items-center gap-3 border-t border-slate-100 pt-3">
                <div className="flex items-center gap-2 flex-1">
                  <span className="text-sm text-slate-500 font-medium">{match.home_team.split(' ').pop()}</span>
                  <input
                    type="number" min="0" max="20"
                    value={inputs[match.id]?.home ?? ''}
                    onChange={e => setInputs(p => ({ ...p, [match.id]: { ...p[match.id], home: e.target.value } }))}
                    placeholder="0"
                    className="w-14 text-center border border-slate-300 rounded-lg py-2 text-slate-800 text-lg font-bold focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                  <span className="text-slate-400 font-bold text-lg">–</span>
                  <input
                    type="number" min="0" max="20"
                    value={inputs[match.id]?.away ?? ''}
                    onChange={e => setInputs(p => ({ ...p, [match.id]: { ...p[match.id], away: e.target.value } }))}
                    placeholder="0"
                    className="w-14 text-center border border-slate-300 rounded-lg py-2 text-slate-800 text-lg font-bold focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                  <span className="text-sm text-slate-500 font-medium">{match.away_team.split(' ').pop()}</span>
                </div>
                <button
                  onClick={() => savePrediction(match.id)}
                  disabled={saving === match.id}
                  className={`px-5 py-2 rounded-lg font-semibold text-sm transition-colors ${
                    saved === match.id
                      ? 'bg-green-100 text-green-700'
                      : 'bg-green-600 hover:bg-green-700 text-white'
                  } disabled:opacity-50`}
                >
                  {saved === match.id ? '✓ Đã lưu' : saving === match.id ? '...' : predictions[match.id] ? 'Cập nhật' : 'Lưu'}
                </button>
              </div>
            </div>
          ))}
        </section>
      )}

      {locked.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-slate-400 mb-3">🔒 Đã khóa dự đoán</h2>
          <div className="space-y-3 opacity-60">
            {locked.map(match => <MatchCard key={match.id} match={match} prediction={predictions[match.id]} />)}
          </div>
        </section>
      )}
    </div>
  )
}

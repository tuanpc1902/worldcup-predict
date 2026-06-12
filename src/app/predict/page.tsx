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

  useEffect(() => {
    if (!loading && !user) router.replace('/login')
  }, [user, loading, router])

  useEffect(() => {
    if (!user) return
    async function load() {
      setFetching(true)
      const now = new Date().toISOString()

      const [{ data: ms }, { data: ps }] = await Promise.all([
        supabase.from('matches').select('*')
          .in('status', ['scheduled', 'live'])
          .order('match_time', { ascending: true }),
        supabase.from('predictions').select('*').eq('user_id', user!.id),
      ])

      const matchList = ms ?? []
      const predMap: Record<string, Prediction> = {}
      const inputMap: Record<string, { home: string; away: string }> = {}

      ;(ps ?? []).forEach((p: Prediction) => { predMap[p.match_id] = p })

      matchList.forEach((m: Match) => {
        if (predMap[m.id]) {
          inputMap[m.id] = {
            home: String(predMap[m.id].predicted_home),
            away: String(predMap[m.id].predicted_away),
          }
        } else {
          inputMap[m.id] = { home: '', away: '' }
        }
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
    const h = parseInt(inp.home)
    const a = parseInt(inp.away)
    if (isNaN(h) || isNaN(a) || h < 0 || a < 0) return

    setSaving(matchId)
    const payload = {
      user_id: user!.id,
      match_id: matchId,
      predicted_home: h,
      predicted_away: a,
    }

    const { error } = await supabase
      .from('predictions')
      .upsert(payload, { onConflict: 'user_id,match_id' })

    if (!error) {
      setPredictions(prev => ({ ...prev, [matchId]: { ...payload, id: '', points_earned: null, scored_at: null, created_at: '' } }))
      setSaved(matchId)
      setTimeout(() => setSaved(null), 2000)
    }
    setSaving(null)
  }

  if (loading || fetching) {
    return (
      <div className="space-y-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-32 bg-gray-800 rounded-xl animate-pulse" />
        ))}
      </div>
    )
  }

  const unlocked = matches.filter(m => !m.is_locked)
  const locked = matches.filter(m => m.is_locked)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Dự đoán</h1>
        <p className="text-gray-400 text-sm mt-1">
          Nhập tỉ số dự đoán trước khi trận bắt đầu. Đúng tỉ số: +5 pts · Đúng kết quả: +3 pts · Sai: -1 pt
        </p>
      </div>

      {unlocked.length === 0 && locked.length === 0 && (
        <div className="text-center text-gray-500 py-20">
          <p className="text-4xl mb-3">📅</p>
          <p>Không có trận nào để dự đoán.</p>
        </div>
      )}

      {unlocked.length > 0 && (
        <section className="space-y-3">
          {unlocked.map(match => (
            <div key={match.id} className="bg-gray-800 rounded-xl p-4 border border-gray-700">
              <MatchCard match={match} prediction={predictions[match.id]} />
              <div className="mt-4 flex items-center gap-3">
                <div className="flex items-center gap-2 flex-1">
                  <input
                    type="number"
                    min="0"
                    max="20"
                    value={inputs[match.id]?.home ?? ''}
                    onChange={e => setInputs(p => ({ ...p, [match.id]: { ...p[match.id], home: e.target.value } }))}
                    placeholder="0"
                    className="w-16 text-center bg-gray-700 border border-gray-600 rounded-lg py-2 text-white text-lg font-bold focus:outline-none focus:border-yellow-500"
                  />
                  <span className="text-gray-400 font-bold">–</span>
                  <input
                    type="number"
                    min="0"
                    max="20"
                    value={inputs[match.id]?.away ?? ''}
                    onChange={e => setInputs(p => ({ ...p, [match.id]: { ...p[match.id], away: e.target.value } }))}
                    placeholder="0"
                    className="w-16 text-center bg-gray-700 border border-gray-600 rounded-lg py-2 text-white text-lg font-bold focus:outline-none focus:border-yellow-500"
                  />
                </div>
                <button
                  onClick={() => savePrediction(match.id)}
                  disabled={saving === match.id}
                  className={`px-4 py-2 rounded-lg font-semibold text-sm transition-colors ${
                    saved === match.id
                      ? 'bg-green-600 text-white'
                      : 'bg-yellow-500 hover:bg-yellow-400 text-black'
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
          <h2 className="text-sm font-semibold text-gray-400 mb-3">🔒 Đã khóa dự đoán</h2>
          <div className="space-y-3 opacity-60">
            {locked.map(match => (
              <MatchCard key={match.id} match={match} prediction={predictions[match.id]} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

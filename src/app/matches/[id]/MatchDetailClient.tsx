'use client'
import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth'
import FlagImg from '@/components/FlagImg'
import ShareCard from '@/components/ShareCard'
import { fmtDate, fmtTime, fmtDateTime, isStarted } from '@/lib/time'
import type { Match, Comment, PredictionStats, MatchGoal } from '@/types'
import type { RealtimePostgresInsertPayload, RealtimePostgresUpdatePayload } from '@supabase/supabase-js'

const STAGE_LABELS: Record<string, string> = {
  group: 'Vòng bảng', round_of_32: 'Vòng 1/16', round_of_16: 'Vòng 1/8',
  quarter: 'Tứ kết', semi: 'Bán kết', final: 'Chung kết',
}

interface SavedPrediction {
  predicted_home: number
  predicted_away: number
  points_earned: number | null
}

interface RawPred {
  predicted_home: number
  predicted_away: number
  points_earned: number | null
  user_id: string
}

interface Props {
  match: Match
  stats: PredictionStats
  comments: Comment[]
  goals: MatchGoal[]
}

const REACTIONS = ['🔥', '😱', '👍', '😂']

function useElapsed(matchTime: string, active: boolean) {
  const [min, setMin] = useState(0)
  useEffect(() => {
    if (!active) return
    function calc() {
      setMin(Math.max(0, Math.floor((Date.now() - new Date(matchTime).getTime()) / 60000)))
    }
    calc()
    const t = setInterval(calc, 30_000)
    return () => clearInterval(t)
  }, [matchTime, active])
  return min
}

export default function MatchDetailClient({ match, stats, comments: initialComments, goals: initialGoals }: Props) {
  const { user, init } = useAuthStore()
  const router = useRouter()
  const supabase = createClient()

  // Realtime match state (score/status updates)
  const [liveMatch, setLiveMatch] = useState<Match>(match)
  const isFinished = liveMatch.status === 'finished'
  const isLive = liveMatch.status === 'live' || (
    !isFinished &&
    new Date(liveMatch.match_time) <= new Date() &&
    (Date.now() - new Date(liveMatch.match_time).getTime()) / 60000 <= 115
  )
  const locked = liveMatch.is_locked || isStarted(liveMatch.match_time)

  const elapsed = useElapsed(liveMatch.match_time, isLive)
  const half = elapsed <= 45 ? '1' : elapsed <= 90 ? '2' : 'ET'
  const dispMin = elapsed <= 45 ? elapsed : elapsed <= 90 ? elapsed - 45 : elapsed - 90

  const [liveGoals, setLiveGoals] = useState<MatchGoal[]>(initialGoals)
  const [myPrediction, setMyPrediction] = useState<{ home: string; away: string }>({ home: '', away: '' })
  const [savedPrediction, setSavedPrediction] = useState<SavedPrediction | null>(null)
  const [saving, setSaving] = useState(false)
  const [predSaved, setPredSaved] = useState(false)
  const [liveStats, setLiveStats] = useState<PredictionStats>(stats)
  const [comments, setComments] = useState<Comment[]>(initialComments)
  const [commentText, setCommentText] = useState('')
  const [posting, setPosting] = useState(false)
  const commentsEndRef = useRef<HTMLDivElement>(null)
  // IDs of comments we added locally — skip when realtime fires to avoid duplicates
  const localCommentIds = useRef<Set<string>>(new Set())

  // Per-user reaction tracking: { [commentId]: Set<emoji> } — persisted in localStorage
  const [myReactions, setMyReactions] = useState<Record<string, Set<string>>>(() => {
    if (typeof window === 'undefined') return {}
    try {
      const raw = localStorage.getItem(`reactions:${match.id}`)
      if (!raw) return {}
      const parsed = JSON.parse(raw) as Record<string, string[]>
      return Object.fromEntries(Object.entries(parsed).map(([k, v]) => [k, new Set(v)]))
    } catch { return {} }
  })

  // Persist myReactions to localStorage on change
  useEffect(() => {
    const toStore = Object.fromEntries(
      Object.entries(myReactions).map(([k, v]) => [k, Array.from(v)])
    )
    localStorage.setItem(`reactions:${match.id}`, JSON.stringify(toStore))
  }, [myReactions, match.id])

  useEffect(() => { init() }, [init])

  // Realtime: match score & status
  useEffect(() => {
    const ch = supabase
      .channel(`match:${match.id}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'matches', filter: `id=eq.${match.id}`,
      }, (payload: RealtimePostgresUpdatePayload<Match>) => {
        setLiveMatch(payload.new)
      })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [match.id])

  // Realtime: new goals
  useEffect(() => {
    const ch = supabase
      .channel(`goals:${match.id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'match_goals', filter: `match_id=eq.${match.id}`,
      }, (payload: RealtimePostgresInsertPayload<MatchGoal>) => {
        setLiveGoals(prev => [...prev, payload.new].sort((a, b) => (a.minute ?? 0) - (b.minute ?? 0)))
      })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [match.id])

  // Realtime: comments INSERT + reaction UPDATE
  useEffect(() => {
    const ch = supabase
      .channel(`comments:${match.id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'match_comments', filter: `match_id=eq.${match.id}`,
      }, async (payload: RealtimePostgresInsertPayload<{ id: string }>) => {
        const newId = payload.new.id
        // Skip comments we added locally (already in state)
        if (localCommentIds.current.has(newId)) return
        const { data } = await supabase
          .from('match_comments')
          .select('id, content, created_at, reactions, user_id, profiles(display_name, avatar_url)')
          .eq('id', newId)
          .single()
        if (data) {
          const comment = { ...data, profiles: Array.isArray(data.profiles) ? data.profiles[0] : data.profiles } as Comment
          setComments(prev => prev.some(c => c.id === newId) ? prev : [...prev, comment])
          setTimeout(() => commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'match_comments', filter: `match_id=eq.${match.id}`,
      }, (payload: RealtimePostgresUpdatePayload<{ id: string; reactions: Record<string, number> }>) => {
        const updated = payload.new
        setComments(prev => prev.map(c => c.id === updated.id ? { ...c, reactions: updated.reactions } : c))
      })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [match.id])

  // Load user prediction
  useEffect(() => {
    if (!user) return
    supabase.from('predictions')
      .select('predicted_home, predicted_away, points_earned')
      .eq('match_id', match.id)
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }: { data: SavedPrediction | null }) => {
        if (data) {
          setSavedPrediction(data)
          setMyPrediction({ home: String(data.predicted_home), away: String(data.predicted_away) })
        }
      })
  }, [user])

  async function savePrediction() {
    if (!user || saving) return
    const h = parseInt(myPrediction.home)
    const a = parseInt(myPrediction.away)
    if (isNaN(h) || isNaN(a) || h < 0 || a < 0) return
    setSaving(true)
    const { error } = await supabase.from('predictions').upsert({
      user_id: user.id, match_id: match.id,
      predicted_home: h, predicted_away: a,
    }, { onConflict: 'user_id,match_id' })
    if (!error) {
      setSavedPrediction({ predicted_home: h, predicted_away: a, points_earned: null })
      setPredSaved(true)
      setTimeout(() => setPredSaved(false), 2500)
      refreshStats()
    }
    setSaving(false)
  }

  async function refreshStats() {
    const { data } = await supabase
      .from('predictions')
      .select('predicted_home, predicted_away, points_earned, user_id')
      .eq('match_id', match.id)
    if (!data) return
    const preds = data as RawPred[]
    const total = preds.length
    if (total === 0) return
    let homeWin = 0, draw = 0, awayWin = 0
    const scoreCount: Record<string, number> = {}
    for (const p of preds) {
      const { predicted_home: ph, predicted_away: pa } = p
      if (ph > pa) homeWin++
      else if (ph === pa) draw++
      else awayWin++
      const key = `${ph}-${pa}`
      scoreCount[key] = (scoreCount[key] ?? 0) + 1
    }
    const topScores = Object.entries(scoreCount)
      .sort(([, a], [, b]) => b - a).slice(0, 5)
      .map(([score, count]) => ({ score, count, pct: Math.round((count / total) * 100) }))
    setLiveStats({
      total,
      homeWin: Math.round((homeWin / total) * 100),
      draw: Math.round((draw / total) * 100),
      awayWin: Math.round((awayWin / total) * 100),
      topScores,
    })
  }

  async function postComment() {
    if (!user || !commentText.trim() || posting) return
    setPosting(true)
    const { data, error } = await supabase.from('match_comments')
      .insert({ match_id: match.id, user_id: user.id, content: commentText.trim() })
      .select('id, content, created_at, reactions, user_id, profiles(display_name, avatar_url)')
      .single()
    if (!error && data) {
      const comment = { ...data, profiles: Array.isArray(data.profiles) ? data.profiles[0] : data.profiles } as Comment
      localCommentIds.current.add(comment.id)
      setComments(prev => [...prev, comment])
      setCommentText('')
      setTimeout(() => commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
    }
    setPosting(false)
  }

  async function react(commentId: string, emoji: string) {
    if (!user) return

    const alreadyReacted = myReactions[commentId]?.has(emoji) ?? false
    const delta = alreadyReacted ? -1 : 1

    // 1. Update per-user tracking
    setMyReactions(prev => {
      const set = new Set(prev[commentId] ?? [])
      alreadyReacted ? set.delete(emoji) : set.add(emoji)
      return { ...prev, [commentId]: set }
    })

    // 2. Optimistic UI — read from latest state via callback to avoid stale closure
    let latestReactions: Record<string, number> = {}
    setComments(prev => {
      const updated = prev.map(c => {
        if (c.id !== commentId) return c
        const next = { ...c.reactions, [emoji]: Math.max(0, (c.reactions[emoji] ?? 0) + delta) }
        latestReactions = next
        return { ...c, reactions: next }
      })
      return updated
    })

    // 3. Persist to DB — wait a tick so latestReactions is populated
    await Promise.resolve()
    await supabase.from('match_comments').update({ reactions: latestReactions }).eq('id', commentId)
  }

  const pointsBg =
    (savedPrediction?.points_earned ?? null) !== null && savedPrediction!.points_earned! > 0
      ? 'bg-green-100 text-green-700 border-green-200' :
    (savedPrediction?.points_earned ?? null) !== null && savedPrediction!.points_earned! < 0
      ? 'bg-red-100 text-red-600 border-red-200' :
    savedPrediction?.points_earned === 0
      ? 'bg-slate-100 text-slate-500 border-slate-200' :
    'bg-slate-50 text-slate-600 border-slate-200'

  // Separate goals by team
  const homeGoals = liveGoals.filter(g => g.team_name === liveMatch.home_team && !g.is_own_goal)
  const awayGoals = liveGoals.filter(g => g.team_name === liveMatch.away_team && !g.is_own_goal)
  const ownGoals  = liveGoals.filter(g => g.is_own_goal)

  return (
    <div className="max-w-2xl mx-auto space-y-4 pb-20">
      {/* Back */}
      <button onClick={() => router.back()} className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 pt-2">
        Quay lại
      </button>

      {/* ── LIVE WATCH BANNER ── */}
      {isLive && (
        <a
          href="https://vtvgo.vn/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 rounded-2xl px-5 py-4 text-white shadow-lg transition-opacity hover:opacity-90"
          style={{ background: 'linear-gradient(135deg, #8b0000, #cc0000)' }}
        >
          <div className="flex-shrink-0 w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-2xl">
            ▶
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-base leading-tight">Xem trực tiếp ngay</p>
            <p className="text-red-200 text-sm mt-0.5">VTVGo · vtvgo.vn</p>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0 bg-white/20 rounded-full px-3 py-1">
            <span className="w-2 h-2 bg-red-300 rounded-full animate-pulse" />
            <span className="text-xs font-bold">LIVE</span>
          </div>
        </a>
      )}

      {/* ── MATCH HERO ── */}
      <div className={`bg-white rounded-2xl border p-6 ${isLive ? 'border-red-200' : 'border-slate-200'}`}>
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-medium text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
            {STAGE_LABELS[liveMatch.stage] ?? liveMatch.stage}
            {liveMatch.group_name && ` · ${liveMatch.group_name}`}
          </span>
          {isLive && (
            <span className="flex items-center gap-1.5 text-xs font-bold text-red-500 bg-red-50 px-3 py-1 rounded-full">
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              H{half} {dispMin}&apos;
            </span>
          )}
          {isFinished && (
            <span className="text-xs font-medium text-slate-400 bg-slate-50 px-3 py-1 rounded-full">Đã kết thúc</span>
          )}
        </div>

        {/* Teams */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 min-w-0 flex flex-col items-center gap-2 text-center">
            <FlagImg team={liveMatch.home_team} flag={liveMatch.home_flag} size="xl" />
            <p className="font-bold text-slate-800 text-base leading-tight line-clamp-2 w-full px-1 break-words">{liveMatch.home_team}</p>
            {/* Home scorers under flag */}
            {homeGoals.length > 0 && (
              <div className="text-xs text-slate-500 space-y-0.5 w-full">
                {homeGoals.map(g => (
                  <p key={g.id} className="truncate">⚽ {g.player_name}{g.minute ? ` ${g.minute}'` : ''}{g.is_penalty ? ' (pen)' : ''}</p>
                ))}
              </div>
            )}
          </div>

          <div className="flex-shrink-0 text-center min-w-[80px]">
            {isFinished || isLive ? (
              <div className={`text-4xl font-black tabular-nums px-4 py-2 rounded-2xl ${
                isLive ? 'text-red-600 bg-red-50' : 'text-slate-800 bg-slate-100'
              }`}>
                {liveMatch.home_score ?? 0} – {liveMatch.away_score ?? 0}
              </div>
            ) : (
              <div className="bg-slate-50 rounded-2xl px-6 py-3 text-center">
                <div className="text-2xl font-black text-slate-800">{fmtTime(liveMatch.match_time)}</div>
                <div className="text-sm text-slate-500 mt-0.5">{fmtDate(liveMatch.match_time)}</div>
              </div>
            )}
            <div className="text-xs text-slate-400 mt-2">VS</div>
          </div>

          <div className="flex-1 min-w-0 flex flex-col items-center gap-2 text-center">
            <FlagImg team={liveMatch.away_team} flag={liveMatch.away_flag} size="xl" />
            <p className="font-bold text-slate-800 text-base leading-tight line-clamp-2 w-full px-1 break-words">{liveMatch.away_team}</p>
            {awayGoals.length > 0 && (
              <div className="text-xs text-slate-500 space-y-0.5 w-full">
                {awayGoals.map(g => (
                  <p key={g.id} className="truncate">⚽ {g.player_name}{g.minute ? ` ${g.minute}'` : ''}{g.is_penalty ? ' (pen)' : ''}</p>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Own goals */}
        {ownGoals.length > 0 && (
          <p className="text-center text-xs text-slate-400 mt-2">
            OG: {ownGoals.map(g => `${g.player_name}${g.minute ? ` ${g.minute}'` : ''}`).join(', ')}
          </p>
        )}

        {liveMatch.venue && (
          <p className="text-center text-xs text-slate-400 mt-4">{liveMatch.venue}</p>
        )}
      </div>

      {/* ── GOAL TIMELINE ── */}
      {liveGoals.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h2 className="font-bold text-sm text-slate-700 mb-4">Diễn biến bàn thắng</h2>
          <div className="relative">
            {/* Center line */}
            <div className="absolute left-1/2 top-0 bottom-0 w-px bg-slate-100 -translate-x-1/2" />
            <div className="space-y-3">
              {liveGoals.map(g => {
                const isHome = g.team_name === liveMatch.home_team
                return (
                  <div key={g.id} className={`flex items-center gap-3 ${isHome ? 'flex-row' : 'flex-row-reverse'}`}>
                    {/* Player info */}
                    <div className={`flex-1 ${isHome ? 'text-right' : 'text-left'}`}>
                      <p className="text-sm font-semibold text-slate-800 leading-tight">
                        {g.is_own_goal ? '(OG) ' : ''}{g.player_name}
                        {g.is_penalty ? ' 🅿' : ''}
                      </p>
                      <p className="text-xs text-slate-400">{g.team_name}</p>
                    </div>
                    {/* Minute badge */}
                    <div className="flex-shrink-0 w-12 flex justify-center">
                      <span className="text-xs font-bold bg-slate-800 text-white rounded-full px-2 py-0.5 tabular-nums">
                        {g.minute ?? '?'}&apos;
                      </span>
                    </div>
                    {/* Flag side */}
                    <div className="flex-1 flex items-center gap-1.5 min-w-0" style={{ flexDirection: isHome ? 'row-reverse' : 'row' }}>
                      <FlagImg team={g.team_name} flag={g.team_flag} size="xs" />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Live stream reminder (not-finished, not-yet-started) */}
      {!isFinished && !isLive && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Xem trực tiếp tại Việt Nam</p>
          <a
            href="https://vtvgo.vn/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-4 py-3 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 flex-shrink-0" />
            <span className="font-semibold text-sm" style={{ color: '#005baa' }}>VTVGo — Xem trực tiếp</span>
            <span className="ml-auto text-slate-400 text-xs">vtvgo.vn ↗</span>
          </a>
        </div>
      )}

      {/* ── MY PREDICTION ── */}
      {user && (
        <>
          <div className={`bg-white rounded-2xl border p-5 ${pointsBg}`}>
            <h2 className="font-bold text-sm mb-3">
              {savedPrediction ? 'Dự đoán của bạn' : 'Nhập dự đoán'}
            </h2>

            {savedPrediction && (
              <div className="flex items-center justify-between mb-3">
                <span className="text-2xl font-black tabular-nums">
                  {savedPrediction.predicted_home} – {savedPrediction.predicted_away}
                </span>
                {savedPrediction.points_earned !== null ? (
                  <span className="text-lg font-black">
                    {savedPrediction.points_earned > 0 ? '+' : ''}{savedPrediction.points_earned} pts
                  </span>
                ) : (
                  <span className="text-xs text-slate-400">Chờ kết quả</span>
                )}
              </div>
            )}

            {!locked && (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 flex-1">
                  <span className="text-xs text-slate-500 truncate flex-1 text-right">{liveMatch.home_team}</span>
                  <input
                    type="number" min="0" max="20"
                    value={myPrediction.home}
                    onChange={e => setMyPrediction(p => ({ ...p, home: e.target.value }))}
                    className="w-14 h-10 text-center text-lg font-bold border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="0"
                  />
                  <span className="text-slate-400 font-bold">–</span>
                  <input
                    type="number" min="0" max="20"
                    value={myPrediction.away}
                    onChange={e => setMyPrediction(p => ({ ...p, away: e.target.value }))}
                    className="w-14 h-10 text-center text-lg font-bold border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="0"
                  />
                  <span className="text-xs text-slate-500 truncate flex-1">{liveMatch.away_team}</span>
                </div>
                <button
                  onClick={savePrediction}
                  disabled={saving || !myPrediction.home || !myPrediction.away}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-bold rounded-lg transition-colors"
                >
                  {saving ? '...' : predSaved ? '✓' : 'Lưu'}
                </button>
              </div>
            )}

            {locked && !savedPrediction && (
              <p className="text-sm text-slate-500">🔒 Trận đã bắt đầu, không thể dự đoán</p>
            )}
          </div>

          {isFinished && savedPrediction?.points_earned !== null && savedPrediction?.points_earned !== undefined && (
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <p className="font-bold text-sm text-slate-700 mb-3">Chia sẻ kết quả</p>
              <ShareCard
                homeTeam={liveMatch.home_team}
                awayTeam={liveMatch.away_team}
                homeScore={liveMatch.home_score}
                awayScore={liveMatch.away_score}
                predictedHome={savedPrediction.predicted_home}
                predictedAway={savedPrediction.predicted_away}
                pointsEarned={savedPrediction.points_earned}
                userName={user?.display_name ?? 'Bạn'}
              />
            </div>
          )}
        </>
      )}

      {!user && !isFinished && !locked && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 text-center">
          <p className="text-slate-600 text-sm mb-3">Đăng nhập để dự đoán kết quả</p>
          <Link href="/login" className="inline-block bg-green-600 hover:bg-green-700 text-white font-bold px-6 py-2 rounded-lg text-sm transition-colors">
            Đăng nhập
          </Link>
        </div>
      )}

      {/* ── COMMUNITY STATS ── */}
      {liveStats.total > 0 && (isFinished || locked) && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h2 className="font-bold text-sm text-slate-700 mb-4">Dự đoán cộng đồng · {liveStats.total} người</h2>
          <div className="mb-4">
            <div className="flex h-3 rounded-full overflow-hidden gap-0.5">
              <div className="bg-blue-500 transition-all" style={{ width: `${liveStats.homeWin}%` }} />
              <div className="bg-slate-300 transition-all" style={{ width: `${liveStats.draw}%` }} />
              <div className="bg-orange-400 transition-all" style={{ width: `${liveStats.awayWin}%` }} />
            </div>
            <div className="flex justify-between text-xs mt-1.5">
              <span className="text-blue-600 font-semibold">{liveMatch.home_team} thắng {liveStats.homeWin}%</span>
              <span className="text-slate-500">Hòa {liveStats.draw}%</span>
              <span className="text-orange-500 font-semibold">{liveStats.awayWin}% {liveMatch.away_team} thắng</span>
            </div>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-2">Tỉ số phổ biến nhất</p>
            <div className="space-y-1.5">
              {liveStats.topScores.map(({ score, count, pct }) => (
                <div key={score} className="flex items-center gap-2">
                  <span className="font-bold text-sm text-slate-800 w-10 text-center">{score}</span>
                  <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-green-400 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-xs text-slate-500 w-20 text-right">{count} người ({pct}%)</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── COMMENTS ── */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <h2 className="font-bold text-sm text-slate-700 mb-4">Bình luận · {comments.length}</h2>
        <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
          {comments.length === 0 && (
            <p className="text-center text-slate-400 text-sm py-6">Chưa có bình luận. Hãy là người đầu tiên!</p>
          )}
          {comments.map(c => (
            <div key={c.id} className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0 text-sm font-bold text-slate-600">
                {c.profiles?.display_name?.[0]?.toUpperCase() ?? '?'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 mb-0.5">
                  <span className="text-sm font-semibold text-slate-800">{c.profiles?.display_name}</span>
                  <span className="text-xs text-slate-400">{fmtDateTime(c.created_at)}</span>
                </div>
                <p className="text-sm text-slate-700 break-words">{c.content}</p>
                <div className="flex gap-1 mt-1.5">
                  {REACTIONS.map(emoji => {
                    const active = myReactions[c.id]?.has(emoji) ?? false
                    const count  = c.reactions[emoji] ?? 0
                    return (
                      <button
                        key={emoji}
                        onClick={() => react(c.id, emoji)}
                        title={user ? undefined : 'Đăng nhập để react'}
                        disabled={!user}
                        className={`flex items-center gap-0.5 text-xs px-2 py-0.5 rounded-full border transition-colors ${
                          active
                            ? 'bg-blue-50 border-blue-300 text-blue-700'
                            : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-600'
                        } disabled:opacity-50 disabled:cursor-default`}
                      >
                        {emoji}
                        {count > 0 && (
                          <span className={active ? 'text-blue-600 font-semibold' : 'text-slate-500'}>
                            {count}
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          ))}
          <div ref={commentsEndRef} />
        </div>

        {user ? (
          <div className="flex gap-2 mt-4 pt-4 border-t border-slate-100">
            <input
              type="text"
              value={commentText}
              onChange={e => setCommentText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && postComment()}
              maxLength={280}
              placeholder="Viết bình luận..."
              className="flex-1 border border-slate-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <button
              onClick={postComment}
              disabled={posting || !commentText.trim()}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-bold rounded-xl transition-colors"
            >
              Gửi
            </button>
          </div>
        ) : (
          <p className="text-center text-slate-400 text-sm mt-4 pt-4 border-t border-slate-100">
            <Link href="/login" className="text-green-600 hover:underline font-semibold">Đăng nhập</Link> để bình luận
          </p>
        )}
      </div>
    </div>
  )
}

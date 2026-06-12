'use client'
import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth'
import FlagImg from '@/components/FlagImg'
import ShareCard from '@/components/ShareCard'
import { fmtDate, fmtTime, fmtDateTime, isStarted } from '@/lib/time'
import type { Match, Comment, PredictionStats } from '@/types'

const STAGE_LABELS: Record<string, string> = {
  group: 'Vòng bảng', round_of_32: 'Vòng 1/16', round_of_16: 'Vòng 1/8',
  quarter: 'Tứ kết', semi: 'Bán kết', final: 'Chung kết',
}

interface SavedPrediction {
  predicted_home: number
  predicted_away: number
  points_earned: number | null
}

interface Props {
  match: Match
  stats: PredictionStats
  comments: Comment[]
}

const REACTIONS = ['🔥', '😱', '👍', '😂']

export default function MatchDetailClient({ match, stats, comments: initialComments }: Props) {
  const { user, init } = useAuthStore()
  const router = useRouter()
  const supabase = createClient()

  const isFinished = match.status === 'finished'
  const isLive = match.status === 'live'
  const locked = match.is_locked || isStarted(match.match_time)

  const [myPrediction, setMyPrediction] = useState<{ home: string; away: string }>({ home: '', away: '' })
  const [savedPrediction, setSavedPrediction] = useState<SavedPrediction | null>(null)
  const [saving, setSaving] = useState(false)
  const [predSaved, setPredSaved] = useState(false)

  const [comments, setComments] = useState<Comment[]>(initialComments)
  const [commentText, setCommentText] = useState('')
  const [posting, setPosting] = useState(false)
  const commentsEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => { init() }, [init])

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
    }
    setSaving(false)
  }

  async function postComment() {
    if (!user || !commentText.trim() || posting) return
    setPosting(true)
    const { data, error } = await supabase.from('match_comments')
      .insert({ match_id: match.id, user_id: user.id, content: commentText.trim() })
      .select('id, content, created_at, reactions, user_id, profiles(display_name, avatar_url)')
      .single()
    if (!error && data) {
      setComments(prev => [...prev, { ...data, profiles: Array.isArray(data.profiles) ? data.profiles[0] : data.profiles } as Comment])
      setCommentText('')
      setTimeout(() => commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
    }
    setPosting(false)
  }

  async function react(commentId: string, emoji: string) {
    if (!user) return
    const comment = comments.find(c => c.id === commentId)
    if (!comment) return
    const newReactions = { ...comment.reactions, [emoji]: (comment.reactions[emoji] ?? 0) + 1 }
    setComments(prev => prev.map(c => c.id === commentId ? { ...c, reactions: newReactions } : c))
    await supabase.from('match_comments').update({ reactions: newReactions }).eq('id', commentId)
  }

  const pointsBg =
    savedPrediction?.points_earned === 5 ? 'bg-green-100 text-green-700 border-green-200' :
    savedPrediction?.points_earned === 3 ? 'bg-blue-100 text-blue-700 border-blue-200' :
    savedPrediction?.points_earned === -1 ? 'bg-red-100 text-red-700 border-red-200' :
    'bg-slate-50 text-slate-600 border-slate-200'

  return (
    <div className="max-w-2xl mx-auto space-y-4 pb-20">
      {/* Back */}
      <button onClick={() => router.back()} className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 pt-2">
        Quay lại
      </button>

      {/* Match Hero */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-medium text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
            {STAGE_LABELS[match.stage] ?? match.stage}
            {match.group_name && ` · ${match.group_name}`}
          </span>
          {isLive && (
            <span className="flex items-center gap-1.5 text-xs font-bold text-red-500 bg-red-50 px-3 py-1 rounded-full">
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" /> LIVE
            </span>
          )}
          {isFinished && (
            <span className="text-xs font-medium text-slate-400 bg-slate-50 px-3 py-1 rounded-full">Đã kết thúc</span>
          )}
        </div>

        {/* Teams */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 flex flex-col items-center gap-2 text-center">
            <FlagImg team={match.home_team} flag={match.home_flag} size="xl" />
            <p className="font-bold text-slate-800 text-base leading-tight">{match.home_team}</p>
          </div>

          <div className="flex-shrink-0 text-center">
            {isFinished || isLive ? (
              <div className={`text-4xl font-black tabular-nums px-4 py-2 rounded-2xl ${
                isLive ? 'text-red-600 bg-red-50' : 'text-slate-800 bg-slate-100'
              }`}>
                {match.home_score ?? 0} – {match.away_score ?? 0}
              </div>
            ) : (
              <div className="bg-slate-50 rounded-2xl px-6 py-3 text-center">
                <div className="text-2xl font-black text-slate-800">{fmtTime(match.match_time)}</div>
                <div className="text-sm text-slate-500 mt-0.5">{fmtDate(match.match_time)}</div>
              </div>
            )}
            <div className="text-xs text-slate-400 mt-2">VS</div>
          </div>

          <div className="flex-1 flex flex-col items-center gap-2 text-center">
            <FlagImg team={match.away_team} flag={match.away_flag} size="xl" />
            <p className="font-bold text-slate-800 text-base leading-tight">{match.away_team}</p>
          </div>
        </div>

        {match.venue && (
          <p className="text-center text-xs text-slate-400 mt-4">📍 {match.venue}</p>
        )}
      </div>

      {/* My Prediction */}
      {user && (
        <>
        <div className={`bg-white rounded-2xl border p-5 ${pointsBg}`}>
          <h2 className="font-bold text-sm mb-3">
            {savedPrediction ? '⚽ Dự đoán của bạn' : '✏️ Nhập dự đoán'}
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
                <span className="text-xs text-slate-500 truncate flex-1 text-right">{match.home_team}</span>
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
                <span className="text-xs text-slate-500 truncate flex-1">{match.away_team}</span>
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

        {/* Share card */}
        {isFinished && savedPrediction?.points_earned !== null && savedPrediction?.points_earned !== undefined && (
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <p className="font-bold text-sm text-slate-700 mb-3">📤 Chia sẻ kết quả</p>
            <ShareCard
              homeTeam={match.home_team}
              awayTeam={match.away_team}
              homeScore={match.home_score}
              awayScore={match.away_score}
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

      {/* Community Stats */}
      {stats.total > 0 && (isFinished || locked) && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h2 className="font-bold text-sm text-slate-700 mb-4">📊 Dự đoán cộng đồng · {stats.total} người</h2>

          {/* Win/Draw/Loss bar */}
          <div className="mb-4">
            <div className="flex h-3 rounded-full overflow-hidden gap-0.5">
              <div className="bg-blue-500 transition-all" style={{ width: `${stats.homeWin}%` }} />
              <div className="bg-slate-300 transition-all" style={{ width: `${stats.draw}%` }} />
              <div className="bg-orange-400 transition-all" style={{ width: `${stats.awayWin}%` }} />
            </div>
            <div className="flex justify-between text-xs mt-1.5">
              <span className="text-blue-600 font-semibold">{match.home_team} thắng {stats.homeWin}%</span>
              <span className="text-slate-500">Hòa {stats.draw}%</span>
              <span className="text-orange-500 font-semibold">{stats.awayWin}% {match.away_team} thắng</span>
            </div>
          </div>

          {/* Top scores */}
          <div>
            <p className="text-xs text-slate-500 mb-2">Tỉ số phổ biến nhất</p>
            <div className="space-y-1.5">
              {stats.topScores.map(({ score, count, pct }) => (
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

      {/* Comments */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <h2 className="font-bold text-sm text-slate-700 mb-4">💬 Bình luận · {comments.length}</h2>

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
                  {REACTIONS.map(emoji => (
                    <button
                      key={emoji}
                      onClick={() => react(c.id, emoji)}
                      className="flex items-center gap-0.5 text-xs bg-slate-50 hover:bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full transition-colors"
                    >
                      {emoji}
                      {c.reactions[emoji] > 0 && <span className="text-slate-500">{c.reactions[emoji]}</span>}
                    </button>
                  ))}
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

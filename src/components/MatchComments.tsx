'use client'
import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth'
import type { RealtimePostgresInsertPayload, RealtimePostgresDeletePayload } from '@supabase/supabase-js'

const REACTIONS = ['🔥', '😱', '👍', '😂', '😤', '🎉']

interface Comment {
  id: string
  content: string
  created_at: string
  user_id: string
  profiles: { display_name: string }
}

// emoji → list of user_ids who reacted
type ReactionMap = Record<string, string[]>
// comment_id → ReactionMap
type AllReactions = Record<string, ReactionMap>

interface RawReaction {
  id: number
  comment_id: string
  user_id: string
  emoji: string
}

export default function MatchComments({ matchId }: { matchId: string }) {
  const { user } = useAuthStore()
  const supabase = createClient()

  const [open, setOpen] = useState(false)
  const [comments, setComments] = useState<Comment[]>([])
  const [reactions, setReactions] = useState<AllReactions>({})
  const [toggling, setToggling] = useState<string | null>(null) // `${commentId}:${emoji}`
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const openRef = useRef(open)
  openRef.current = open
  const commentsRef = useRef<Comment[]>([])
  commentsRef.current = comments

  // ---------- loaders ----------

  async function loadComments() {
    const { data } = await supabase
      .from('match_comments')
      .select('id, content, created_at, user_id, profiles(display_name)')
      .eq('match_id', matchId)
      .order('created_at', { ascending: true })
    setComments((data ?? []) as Comment[])
  }

  async function loadReactions(commentIds: string[]) {
    if (commentIds.length === 0) return
    const { data } = await supabase
      .from('comment_reactions')
      .select('id, comment_id, user_id, emoji')
      .in('comment_id', commentIds)
    buildReactionMap(data ?? [])
  }

  function buildReactionMap(rows: RawReaction[]) {
    const map: AllReactions = {}
    for (const r of rows) {
      if (!map[r.comment_id]) map[r.comment_id] = {}
      if (!map[r.comment_id][r.emoji]) map[r.comment_id][r.emoji] = []
      if (!map[r.comment_id][r.emoji].includes(r.user_id)) {
        map[r.comment_id][r.emoji].push(r.user_id)
      }
    }
    setReactions(map)
  }

  // ---------- initial load ----------

  useEffect(() => {
    if (!open) return

    async function init() {
      await loadComments()
    }
    init()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, matchId])

  // load reactions whenever comments list changes
  useEffect(() => {
    if (comments.length > 0) {
      loadReactions(comments.map(c => c.id))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [comments.length, matchId])

  // ---------- realtime ----------

  useEffect(() => {
    if (!open) return

    const channel = supabase
      .channel(`comments:${matchId}`)
      // New comment
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'match_comments', filter: `match_id=eq.${matchId}` },
        async () => {
          // Re-fetch to get profiles joined
          const { data } = await supabase
            .from('match_comments')
            .select('id, content, created_at, user_id, profiles(display_name)')
            .eq('match_id', matchId)
            .order('created_at', { ascending: true })
          const list = (data ?? []) as Comment[]
          setComments(list)
          setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 80)
        }
      )
      // Reaction added
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'comment_reactions' },
        (payload: RealtimePostgresInsertPayload<RawReaction>) => {
          const r = payload.new
          setReactions(prev => {
            const next = { ...prev }
            if (!next[r.comment_id]) next[r.comment_id] = {}
            const users = next[r.comment_id][r.emoji] ?? []
            if (users.includes(r.user_id)) return prev
            next[r.comment_id] = { ...next[r.comment_id], [r.emoji]: [...users, r.user_id] }
            return next
          })
        }
      )
      // Reaction removed
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'comment_reactions' },
        async (payload: RealtimePostgresDeletePayload<RawReaction>) => {
          const { comment_id, user_id: uid, emoji } = payload.old
          // REPLICA IDENTITY FULL gives us all fields; fallback: re-fetch the comment's reactions
          if (!comment_id || !uid || !emoji) {
            // Only have id — refetch all reactions for visible comments
            const ids = comments.map(c => c.id)
            if (ids.length > 0) {
              const { data } = await supabase
                .from('comment_reactions')
                .select('id, comment_id, user_id, emoji')
                .in('comment_id', ids)
              buildReactionMap(data ?? [])
            }
            return
          }
          setReactions(prev => {
            const next = { ...prev }
            if (!next[comment_id]?.[emoji]) return prev
            next[comment_id] = {
              ...next[comment_id],
              [emoji]: next[comment_id][emoji].filter((u: string) => u !== uid),
            }
            return next
          })
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, matchId])

  // ---------- actions ----------

  async function send() {
    if (!text.trim() || !user || sending) return
    setSending(true)
    await supabase.from('match_comments').insert({
      match_id: matchId,
      user_id: user.id,
      content: text.trim(),
    })
    setText('')
    setSending(false)
    // realtime INSERT will update comments list
  }

  async function toggleReaction(commentId: string, emoji: string) {
    if (!user) return
    const key = `${commentId}:${emoji}`
    if (toggling === key) return
    setToggling(key)

    const alreadyReacted = reactions[commentId]?.[emoji]?.includes(user.id)

    // Optimistic update immediately
    setReactions(prev => {
      const next = { ...prev }
      const current = next[commentId]?.[emoji] ?? []
      next[commentId] = {
        ...next[commentId],
        [emoji]: alreadyReacted
          ? current.filter(u => u !== user.id)
          : [...current, user.id],
      }
      return next
    })

    let error
    if (alreadyReacted) {
      const res = await supabase.from('comment_reactions')
        .delete()
        .eq('comment_id', commentId)
        .eq('user_id', user.id)
        .eq('emoji', emoji)
      error = res.error
    } else {
      const res = await supabase.from('comment_reactions')
        .insert({ comment_id: commentId, user_id: user.id, emoji })
      error = res.error
    }

    if (error) {
      console.error('[reaction error]', error.message, error.code, error.details)
      // Rollback optimistic update
      setReactions(prev => {
        const next = { ...prev }
        const current = next[commentId]?.[emoji] ?? []
        next[commentId] = {
          ...next[commentId],
          [emoji]: alreadyReacted
            ? [...current, user.id]
            : current.filter(u => u !== user.id),
        }
        return next
      })
    } else {
      // Verify DB state — overwrite optimistic with real data
      const ids = commentsRef.current.map(c => c.id)
      if (ids.length > 0) {
        const { data } = await supabase
          .from('comment_reactions')
          .select('id, comment_id, user_id, emoji')
          .in('comment_id', ids)
        buildReactionMap(data ?? [])
      }
    }

    setToggling(null)
  }

  // ---------- helpers ----------

  const totalComments = comments.length

  function fmtTime(dt: string) {
    return new Date(dt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
  }

  // ---------- render ----------

  return (
    <div className="mt-3 border-t border-slate-100 pt-3">
      <button
        onClick={() => setOpen(v => !v)}
        className="text-xs text-slate-400 hover:text-slate-600 transition-colors flex items-center gap-1"
      >
        💬 {!open && totalComments > 0 ? `${totalComments} bình luận` : open ? 'Ẩn bình luận' : 'Bình luận'}
      </button>

      {open && (
        <div className="mt-3 space-y-3">
          {comments.length === 0 && (
            <p className="text-xs text-slate-400 italic">Chưa có bình luận.</p>
          )}

          {comments.map(c => {
            const cReactions = reactions[c.id] ?? {}
            const activeEmojis = REACTIONS.filter(e => (cReactions[e]?.length ?? 0) > 0)
            const myReacted = new Set(
              REACTIONS.filter(e => user && cReactions[e]?.includes(user.id))
            )

            return (
              <div key={c.id} className="text-sm group">
                {/* Author + time */}
                <div className="flex items-baseline gap-1.5">
                  <span className="font-semibold text-slate-700 text-[13px]">
                    {c.profiles?.display_name}
                  </span>
                  <span className="text-[10px] text-slate-400">{fmtTime(c.created_at)}</span>
                </div>

                {/* Content */}
                <p className="text-slate-600 mt-0.5 leading-snug">{c.content}</p>

                {/* Reactions row */}
                <div className="flex flex-wrap gap-1 mt-1.5 items-center">
                  {/* Active reactions (with count) */}
                  {activeEmojis.map(emoji => {
                    const users = cReactions[emoji] ?? []
                    const mine = myReacted.has(emoji)
                    return (
                      <button
                        key={emoji}
                        onClick={() => toggleReaction(c.id, emoji)}
                        disabled={!user || toggling === `${c.id}:${emoji}`}
                        title={users.length === 1 ? '1 người' : `${users.length} người`}
                        className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs font-medium border transition-all select-none ${
                          mine
                            ? 'bg-yellow-50 border-yellow-300 text-yellow-700'
                            : 'bg-slate-50 border-slate-200 text-slate-500 hover:border-slate-300'
                        }`}
                      >
                        <span>{emoji}</span>
                        <span>{users.length}</span>
                      </button>
                    )
                  })}

                  {/* Add reaction — show on hover */}
                  {user && (
                    <div className="relative group/react">
                      <button className="text-slate-300 hover:text-slate-500 transition-colors text-xs px-1 opacity-0 group-hover:opacity-100">
                        ＋
                      </button>
                      {/* Emoji picker on hover */}
                      <div className="absolute bottom-full left-0 mb-1 hidden group-hover/react:flex bg-white border border-slate-200 rounded-xl shadow-lg px-2 py-1.5 gap-1 z-10">
                        {REACTIONS.map(emoji => (
                          <button
                            key={emoji}
                            onClick={() => toggleReaction(c.id, emoji)}
                            disabled={toggling === `${c.id}:${emoji}`}
                            className={`text-base hover:scale-125 transition-transform px-0.5 ${myReacted.has(emoji) ? 'opacity-50' : ''}`}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )
          })}

          <div ref={bottomRef} />

          {user && (
            <div className="flex gap-2 mt-2">
              <input
                value={text}
                onChange={e => setText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
                placeholder="Nhập bình luận..."
                maxLength={280}
                className="flex-1 border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-green-500"
              />
              <button
                onClick={send}
                disabled={sending || !text.trim()}
                className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
              >
                Gửi
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

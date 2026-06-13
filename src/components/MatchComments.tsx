'use client'
import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth'
import type { RealtimePostgresInsertPayload } from '@supabase/supabase-js'

interface Comment {
  id: string
  content: string
  created_at: string
  user_id: string
  profiles: { display_name: string }
}

interface RawComment {
  id: string
  content: string
  created_at: string
  user_id: string
  profiles: { display_name: string }
}

export default function MatchComments({ matchId }: { matchId: string }) {
  const { user } = useAuthStore()
  const supabase = createClient()

  const [open, setOpen] = useState(false)
  const [comments, setComments] = useState<Comment[]>([])
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  async function loadComments() {
    const { data } = await supabase
      .from('match_comments')
      .select('id, content, created_at, user_id, profiles(display_name)')
      .eq('match_id', matchId)
      .order('created_at', { ascending: true })
    setComments((data ?? []) as Comment[])
  }

  useEffect(() => {
    if (!open) return
    loadComments()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, matchId])

  useEffect(() => {
    if (!open) return

    const channel = supabase
      .channel(`comments:${matchId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'match_comments', filter: `match_id=eq.${matchId}` },
        async (payload: RealtimePostgresInsertPayload<RawComment>) => {
          // Fetch with profiles join
          const { data } = await supabase
            .from('match_comments')
            .select('id, content, created_at, user_id, profiles(display_name)')
            .eq('id', payload.new.id)
            .maybeSingle()
          if (data) {
            setComments(prev => [...prev, data as Comment])
            setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 80)
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, matchId])

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
  }

  function fmtTime(dt: string) {
    return new Date(dt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="mt-3 border-t border-slate-100 pt-3">
      <button
        onClick={() => setOpen(v => !v)}
        className="text-xs text-slate-400 hover:text-slate-600 transition-colors flex items-center gap-1"
      >
        💬 {!open && comments.length > 0 ? `${comments.length} bình luận` : open ? 'Ẩn bình luận' : 'Bình luận'}
      </button>

      {open && (
        <div className="mt-3 space-y-3">
          {comments.length === 0 && (
            <p className="text-xs text-slate-400 italic">Chưa có bình luận.</p>
          )}

          {comments.map(c => (
            <div key={c.id} className="text-sm">
              <div className="flex items-baseline gap-1.5">
                <span className="font-semibold text-slate-700 text-[13px]">{c.profiles?.display_name}</span>
                <span className="text-[10px] text-slate-400">{fmtTime(c.created_at)}</span>
              </div>
              <p className="text-slate-600 mt-0.5 leading-snug">{c.content}</p>
            </div>
          ))}

          <div ref={bottomRef} />

          {user && (
            <div className="flex gap-2 mt-2">
              <input
                value={text}
                onChange={e => setText(e.target.value.replace(/\p{Emoji_Presentation}|\p{Extended_Pictographic}/gu, ''))}
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

'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth'

const REACTIONS = ['🔥', '😱', '👍', '😂']

interface Comment {
  id: string
  content: string
  reactions: Record<string, number>
  created_at: string
  profiles: { display_name: string }
  user_id: string
}

export default function MatchComments({ matchId }: { matchId: string }) {
  const { user } = useAuthStore()
  const supabase = createClient()
  const [comments, setComments] = useState<Comment[]>([])
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [open, setOpen] = useState(false)

  async function load() {
    const { data } = await supabase
      .from('match_comments')
      .select('*, profiles(display_name)')
      .eq('match_id', matchId)
      .order('created_at', { ascending: true })
    setComments((data ?? []) as Comment[])
  }

  useEffect(() => { if (open) load() }, [open, matchId])

  async function send() {
    if (!text.trim() || !user) return
    setSending(true)
    await supabase.from('match_comments').insert({ match_id: matchId, user_id: user.id, content: text.trim() })
    setText('')
    await load()
    setSending(false)
  }

  async function react(commentId: string, emoji: string, current: number) {
    await supabase.from('match_comments')
      .update({ reactions: { ...comments.find(c => c.id === commentId)?.reactions, [emoji]: current + 1 } })
      .eq('id', commentId)
    await load()
  }

  return (
    <div className="mt-3 border-t border-slate-100 pt-3">
      <button onClick={() => setOpen(!open)} className="text-xs text-slate-400 hover:text-slate-600 transition-colors flex items-center gap-1">
        💬 {comments.length > 0 && !open ? `${comments.length} bình luận` : open ? 'Ẩn' : 'Bình luận'}
      </button>

      {open && (
        <div className="mt-3 space-y-3">
          {comments.map(c => (
            <div key={c.id} className="text-sm">
              <span className="font-medium text-slate-700">{c.profiles?.display_name}</span>
              <span className="text-slate-500 ml-2">{c.content}</span>
              <div className="flex gap-2 mt-1">
                {REACTIONS.map(emoji => (
                  <button key={emoji} onClick={() => react(c.id, emoji, c.reactions[emoji] ?? 0)}
                    className="text-xs hover:scale-110 transition-transform flex items-center gap-0.5">
                    {emoji} {c.reactions[emoji] > 0 && <span className="text-slate-400">{c.reactions[emoji]}</span>}
                  </button>
                ))}
              </div>
            </div>
          ))}

          {user && (
            <div className="flex gap-2 mt-2">
              <input value={text} onChange={e => setText(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()}
                placeholder="Nhập bình luận..." maxLength={280}
                className="flex-1 border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-green-500" />
              <button onClick={send} disabled={sending || !text.trim()}
                className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg text-sm font-medium">
                Gửi
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth'
import type { Match } from '@/types'

interface Props { match: Match }

export default function MatchReminder({ match }: Props) {
  const { user } = useAuthStore()
  const supabase = createClient()
  const [supported, setSupported] = useState(false)
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [reminded, setReminded] = useState(false)
  const [loading, setLoading] = useState(false)

  const matchTime = new Date(match.match_time).getTime()
  const now = Date.now()
  const isPast = now >= matchTime - 60000 // less than 1 min before

  useEffect(() => {
    setSupported('Notification' in window)
    if ('Notification' in window) setPermission(Notification.permission)
  }, [])

  useEffect(() => {
    if (!user || !supabase) return
    supabase.from('match_reminders').select('id').eq('user_id', user.id).eq('match_id', match.id).maybeSingle()
      .then((res: { data: unknown }) => { if (res.data) setReminded(true) })
  }, [user, match.id])

  if (!supported || isPast || !user) return null

  async function toggle() {
    if (!user) return
    setLoading(true)
    if (reminded) {
      await supabase.from('match_reminders').delete().eq('user_id', user.id).eq('match_id', match.id)
      setReminded(false)
    } else {
      if (permission !== 'granted') {
        const result = await Notification.requestPermission()
        setPermission(result)
        if (result !== 'granted') { setLoading(false); return }
      }
      const remindAt = new Date(matchTime - 15 * 60 * 1000).toISOString()
      await supabase.from('match_reminders').upsert({ user_id: user.id, match_id: match.id, remind_at: remindAt, sent: false })
      setReminded(true)

      // Schedule local notification if page stays open (fallback)
      const msUntil = matchTime - 15 * 60 * 1000 - Date.now()
      if (msUntil > 0 && msUntil < 3600000) {
        setTimeout(() => {
          new Notification('Sap den gio thi dau!', {
            body: match.home_team + ' vs ' + match.away_team + ' - con 15 phut nua',
            icon: '/favicon.ico',
          })
        }, msUntil)
      }
    }
    setLoading(false)
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={"flex items-center gap-1.5 text-xs px-2 py-1 rounded-lg transition-colors " + (reminded ? 'text-amber-600 bg-amber-50 hover:bg-amber-100' : 'text-slate-500 hover:text-amber-600 hover:bg-amber-50')}
      title={reminded ? 'Huy nhac nho' : 'Dat nhac nho 15 phut truoc'}
    >
      <span>{reminded ? '🔔' : '🔕'}</span>
      <span>{reminded ? 'Da dat nhac' : 'Nhac nho'}</span>
    </button>
  )
}

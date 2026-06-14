'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import type { UserAchievement } from '@/types'

export default function AchievementBadges({ userId }: { userId: string }) {
  const [awards, setAwards] = useState<UserAchievement[]>([])
  const supabase = createClient()

  useEffect(() => {
    supabase
      .from('user_achievements')
      .select('*, achievements(*)')
      .eq('user_id', userId)
      .order('awarded_at', { ascending: true })
      .then((res: { data: unknown[] | null }) => setAwards(((res.data) ?? []) as UserAchievement[]))
  }, [userId])

  if (awards.length === 0) return null

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5">
      <h2 className="text-sm font-bold text-slate-600 mb-3">Huy hiệu ({awards.length})</h2>
      <div className="flex flex-wrap gap-2">
        {awards.map(a => (
          <div
            key={a.achievement_id}
            title={a.achievements.description}
            className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 rounded-xl px-3 py-1.5 cursor-default"
          >
            <span className="text-lg leading-none">{a.achievements.icon}</span>
            <div>
              <div className="text-xs font-bold text-amber-800 leading-tight">{a.achievements.name}</div>
              {a.achievements.points > 0 && (
                <div className="text-[10px] text-amber-600">+{a.achievements.points} pts</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

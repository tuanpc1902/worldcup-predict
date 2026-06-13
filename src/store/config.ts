'use client'
import { create } from 'zustand'
import { createClient } from '@/lib/supabase'
import type { RealtimeChannel } from '@supabase/supabase-js'

export interface SystemConfig {
  realtime_leaderboard: boolean
  realtime_match: boolean
  realtime_profile: boolean
  predictions_open: boolean
  comments_enabled: boolean
  champion_picks_open: boolean
  nav_predict: boolean
  nav_history: boolean
  nav_standings: boolean
  nav_leaderboard: boolean
  nav_champion: boolean
  nav_bracket: boolean
  nav_h2h: boolean
  nav_groups: boolean
}

const DEFAULTS: SystemConfig = {
  realtime_leaderboard: true,
  realtime_match: true,
  realtime_profile: true,
  predictions_open: true,
  comments_enabled: true,
  champion_picks_open: true,
  nav_predict: true,
  nav_history: true,
  nav_standings: true,
  nav_leaderboard: true,
  nav_champion: true,
  nav_bracket: true,
  nav_h2h: true,
  nav_groups: true,
}

interface ConfigState {
  config: SystemConfig
  loaded: boolean
  load: () => Promise<void>
  set: (key: keyof SystemConfig, value: boolean) => void
}

let _configChannel: RealtimeChannel | null = null

export const useConfigStore = create<ConfigState>((set, get) => ({
  config: DEFAULTS,
  loaded: false,

  load: async () => {
    if (get().loaded) return
    const supabase = createClient()

    // Initial fetch
    const { data } = await supabase.from('system_config').select('key, value')
    if (data) {
      const parsed = { ...DEFAULTS }
      for (const row of data) {
        if (row.key in parsed) {
          (parsed as Record<string, boolean>)[row.key] = row.value === 'true'
        }
      }
      set({ config: parsed, loaded: true })
    }

    // Realtime: react to any UPDATE on system_config immediately
    if (_configChannel) {
      supabase.removeChannel(_configChannel)
      _configChannel = null
    }
    _configChannel = supabase
      .channel('system-config-changes')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'system_config' },
        (payload: { new: { key: string; value: string } }) => {
          const { key, value } = payload.new
          if (key in DEFAULTS) {
            set(s => ({
              config: { ...s.config, [key]: value === 'true' },
            }))
          }
        }
      )
      .subscribe()
  },

  set: (key, value) => {
    set(s => ({ config: { ...s.config, [key]: value } }))
  },
}))

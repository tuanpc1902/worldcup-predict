'use client'
import { create } from 'zustand'
import { createClient } from '@/lib/supabase'
import type { AuthChangeEvent, Session, RealtimeChannel, RealtimePostgresUpdatePayload } from '@supabase/supabase-js'
import type { Profile } from '@/types'

interface AuthState {
  user: Profile | null
  loading: boolean
  initialized: boolean
  init: () => Promise<void>
  signOut: () => Promise<void>
  refresh: () => Promise<void>
}

let _channel: RealtimeChannel | null = null
let _authSub: { data: { subscription: { unsubscribe: () => void } } } | null = null

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  loading: true,
  initialized: false,

  init: async () => {
    if (get().initialized) return
    set({ initialized: true })

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { set({ user: null, loading: false }); return }

    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle()

    set({ user: data ?? null, loading: false })

    // Realtime: update user profile when points/data changes in DB
    if (_channel) { supabase.removeChannel(_channel); _channel = null }
    _channel = supabase
      .channel(`profile:${user.id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'profiles',
        filter: `id=eq.${user.id}`,
      }, (payload: RealtimePostgresUpdatePayload<Profile>) => {
        set({ user: payload.new })
      })
      .subscribe()

    if (_authSub) _authSub.data.subscription.unsubscribe()
    _authSub = supabase.auth.onAuthStateChange(async (_event: AuthChangeEvent, session: Session | null) => {
      if (!session?.user) { set({ user: null }); return }
      const { data: profile } = await supabase
        .from('profiles').select('*').eq('id', session.user.id).maybeSingle()
      set({ user: profile ?? null })
    })
  },

  refresh: async () => {
    const current = get().user
    if (!current) return
    const supabase = createClient()
    const { data } = await supabase.from('profiles').select('*').eq('id', current.id).maybeSingle()
    if (data) set({ user: data as Profile })
  },

  signOut: async () => {
    const supabase = createClient()
    if (_channel) { supabase.removeChannel(_channel); _channel = null }
    if (_authSub) { _authSub.data.subscription.unsubscribe(); _authSub = null }
    await supabase.auth.signOut()
    set({ user: null, initialized: false })
  },
}))

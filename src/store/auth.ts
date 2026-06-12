'use client'
import { create } from 'zustand'
import { createClient } from '@/lib/supabase'
import type { AuthChangeEvent, Session } from '@supabase/supabase-js'
import type { Profile } from '@/types'

interface AuthState {
  user: Profile | null
  loading: boolean
  initialized: boolean
  init: () => Promise<void>
  signOut: () => Promise<void>
}

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

    supabase.auth.onAuthStateChange(async (_event: AuthChangeEvent, session: Session | null) => {
      if (!session?.user) { set({ user: null }); return }
      const { data: profile } = await supabase
        .from('profiles').select('*').eq('id', session.user.id).maybeSingle()
      set({ user: profile ?? null })
    })
  },

  signOut: async () => {
    await createClient().auth.signOut()
    set({ user: null, initialized: false })
  },
}))

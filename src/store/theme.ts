'use client'
import { create } from 'zustand'

interface ThemeState {
  dark: boolean
  toggle: () => void
  init: () => void
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  dark: false,

  init: () => {
    const stored = localStorage.getItem('theme')
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const dark = stored ? stored === 'dark' : prefersDark
    document.documentElement.classList.toggle('dark', dark)
    set({ dark })
  },

  toggle: () => {
    const dark = !get().dark
    document.documentElement.classList.toggle('dark', dark)
    localStorage.setItem('theme', dark ? 'dark' : 'light')
    set({ dark })
  },
}))

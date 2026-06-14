'use client'
import { useConfigStore, type SystemConfig } from '@/store/config'

export function useConfig<K extends keyof SystemConfig>(key: K): SystemConfig[K] {
  return useConfigStore(s => s.config[key])
}

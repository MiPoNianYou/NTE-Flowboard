import { createContext, useContext, type ReactNode } from 'react'
import type { BehaviorSettings } from '../types'
import { useSettingsState } from '../hooks/useSettings'

interface SettingsContextValue {
  settings: BehaviorSettings
  updateSettings: (partial: Partial<BehaviorSettings>) => void
}

const SettingsContext = createContext<SettingsContextValue | null>(null)

export function SettingsProvider({ children }: { children: ReactNode }) {
  const { settings, updateSettings } = useSettingsState()
  return (
    <SettingsContext.Provider value={{ settings, updateSettings }}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings(): SettingsContextValue {
  const context = useContext(SettingsContext)
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider')
  }
  return context
}

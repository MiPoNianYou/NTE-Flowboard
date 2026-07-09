import { createContext, useContext } from 'react'
import type { BehaviorSettings, UiPreferences } from '../types'

export interface SettingsContextValue {
  settings: BehaviorSettings
  updateSettings: (partial: Partial<BehaviorSettings>) => void
  uiPreferences: UiPreferences
  updateUiPreferences: (partial: Partial<UiPreferences>) => void
}

export const SettingsContext = createContext<SettingsContextValue | null>(null)

export function useSettings(): SettingsContextValue {
  const context = useContext(SettingsContext)
  if (!context) {
    throw new Error('useSettings must be used within a SettingsContext.Provider')
  }
  return context
}

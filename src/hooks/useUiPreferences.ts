import { useState, useCallback } from 'react'
import type { UiPreferences } from '../types'

const UI_PREFERENCES_KEY = 'flowboard-ui-preferences'

const DEFAULT_UI_PREFERENCES: UiPreferences = {
  cloudPatchHidden: false,
}

function loadUiPreferences(): UiPreferences {
  const raw = localStorage.getItem(UI_PREFERENCES_KEY)
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as Record<string, unknown>
      return {
        cloudPatchHidden:
          typeof parsed.cloudPatchHidden === 'boolean'
            ? parsed.cloudPatchHidden
            : DEFAULT_UI_PREFERENCES.cloudPatchHidden,
      }
    } catch {
      // 解析失败，回退默认值
    }
  }

  return DEFAULT_UI_PREFERENCES
}

export function useUiPreferencesState() {
  const [uiPreferences, setUiPreferences] = useState<UiPreferences>(() => loadUiPreferences())

  const updateUiPreferences = useCallback((partial: Partial<UiPreferences>) => {
    setUiPreferences((prev) => {
      const next = { ...prev, ...partial }
      localStorage.setItem(UI_PREFERENCES_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  return { uiPreferences, updateUiPreferences }
}

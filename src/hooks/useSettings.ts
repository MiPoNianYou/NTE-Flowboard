import { useState, useCallback, useEffect } from 'react'
import type { BehaviorSettings, ServerRegion } from '../types'
import { isServerRegion } from '../utils/validation'
import { DEFAULT_SETTINGS } from '../utils/seed'

const SETTINGS_KEY = 'flowboard-settings'

function loadSettings(): BehaviorSettings {
  const raw = localStorage.getItem(SETTINGS_KEY)
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as Record<string, unknown>
      return {
        serverRegion:
          typeof parsed.serverRegion === 'string' && isServerRegion(parsed.serverRegion)
            ? (parsed.serverRegion as ServerRegion)
            : DEFAULT_SETTINGS.serverRegion,
        isAutoMoveEnabled:
          typeof parsed.isAutoMoveEnabled === 'boolean'
            ? parsed.isAutoMoveEnabled
            : DEFAULT_SETTINGS.isAutoMoveEnabled,
        shouldConfirmDelete:
          typeof parsed.shouldConfirmDelete === 'boolean'
            ? parsed.shouldConfirmDelete
            : DEFAULT_SETTINGS.shouldConfirmDelete,
      }
    } catch {
      // 解析失败，走迁移
    }
  }

  // 迁移旧 key
  const autoMove = localStorage.getItem('flowboard-setting-auto-move')
  const confirmDelete = localStorage.getItem('flowboard-setting-confirm-delete')

  const settings: BehaviorSettings = {
    serverRegion: DEFAULT_SETTINGS.serverRegion,
    isAutoMoveEnabled:
      autoMove !== null ? autoMove !== 'false' : DEFAULT_SETTINGS.isAutoMoveEnabled,
    shouldConfirmDelete:
      confirmDelete !== null ? confirmDelete !== 'false' : DEFAULT_SETTINGS.shouldConfirmDelete,
  }

  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
  if (autoMove !== null) localStorage.removeItem('flowboard-setting-auto-move')
  if (confirmDelete !== null) localStorage.removeItem('flowboard-setting-confirm-delete')

  return settings
}

export function useSettingsState() {
  const [settings, setSettings] = useState<BehaviorSettings>(() => loadSettings())

  useEffect(() => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
  }, [settings])

  const updateSettings = useCallback((partial: Partial<BehaviorSettings>) => {
    setSettings((prev) => ({ ...prev, ...partial }))
  }, [])

  return { settings, updateSettings }
}

import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import {
  SettingsContext,
  useSettings,
  type SettingsContextValue,
} from '../../src/context/SettingsContext'

const value: SettingsContextValue = {
  settings: {
    serverRegion: 'asia',
    isAutoMoveEnabled: true,
    shouldConfirmDelete: true,
  },
  updateSettings: vi.fn(),
  uiPreferences: { cloudPatchHidden: false },
  updateUiPreferences: vi.fn(),
}

describe('useSettings', () => {
  it('returns the nearest provider value', () => {
    const { result } = renderHook(() => useSettings(), {
      wrapper: ({ children }) => (
        <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
      ),
    })

    expect(result.current).toBe(value)
  })

  it('fails clearly when used outside SettingsContext.Provider', () => {
    expect(() => renderHook(() => useSettings())).toThrow(
      'useSettings must be used within a SettingsContext.Provider',
    )
  })
})

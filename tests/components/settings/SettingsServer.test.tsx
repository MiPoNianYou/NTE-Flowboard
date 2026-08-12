import type { ReactNode } from 'react'
import { render as renderBase, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { SettingsServer } from '../../../src/components/settings/SettingsServer'
import { LocalUiPreferencesProvider } from '../../../src/context/LocalUiPreferencesContext'
import { LOCAL_UI_PREFERENCES_STORAGE_KEY } from '../../../src/utils/localUiPreferences'

function render(ui: ReactNode) {
  return renderBase(<LocalUiPreferencesProvider>{ui}</LocalUiPreferencesProvider>)
}

const mockUpdateSettings = vi.fn()
let mockServerRegion = 'asia'

vi.mock('../../../src/context/SettingsContext', () => ({
  useSettings: () => ({
    settings: {
      serverRegion: mockServerRegion,
      isAutoMoveEnabled: true,
      shouldConfirmDelete: true,
    },
    updateSettings: mockUpdateSettings,
  }),
}))

describe('SettingsServer', () => {
  it('should render all regions and expose the current selection', () => {
    mockServerRegion = 'america'
    render(<SettingsServer isEmbedded />)

    expect(screen.getByRole('button', { name: /亚太服/ })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('button', { name: /美服/ })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: /欧服/ })).toBeInTheDocument()
    mockServerRegion = 'asia'
  })

  it('should call updateSettings when region clicked', () => {
    mockUpdateSettings.mockClear()
    render(<SettingsServer isEmbedded />)
    fireEvent.click(screen.getByText('欧服').closest('button')!)
    expect(mockUpdateSettings).toHaveBeenCalledWith({ serverRegion: 'europe' })
  })

  it('should render reset time info', () => {
    render(<SettingsServer isEmbedded />)
    expect(screen.getByText(/每日 · 每周一 · 每月一日/)).toBeInTheDocument()
    expect(screen.getByText(/5:00/)).toBeInTheDocument()
    expect(screen.getByText(/重置/)).toBeInTheDocument()
  })

  it('uses the compact English schedule with a 12-hour reset time', async () => {
    localStorage.setItem(
      LOCAL_UI_PREFERENCES_STORAGE_KEY,
      JSON.stringify({ language: 'en-US', timeFormat: '12h' }),
    )

    render(<SettingsServer isEmbedded />)

    await waitFor(() =>
      expect(
        screen.getByText('Resets: daily, weekly (Mon), monthly (1st) at 5:00 AM'),
      ).toBeInTheDocument(),
    )
  })

  it('should not render back button when isEmbedded', () => {
    render(<SettingsServer isEmbedded />)
    expect(screen.queryByLabelText('返回')).not.toBeInTheDocument()
  })
})

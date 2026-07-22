import type { ReactNode } from 'react'
import { render as renderBase, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { SettingsServer } from '../../../components/settings/SettingsServer'
import { DisplayPreferencesProvider } from '../../../context/DisplayPreferencesContext'
import { DISPLAY_PREFERENCES_STORAGE_KEY } from '../../../i18n/displayPreferences'

function render(ui: ReactNode) {
  return renderBase(<DisplayPreferencesProvider>{ui}</DisplayPreferencesProvider>)
}

const mockUpdateSettings = vi.fn()
let mockServerRegion = 'asia'

vi.mock('../../../context/SettingsContext', () => ({
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
  it('should render all server regions', () => {
    render(<SettingsServer isEmbedded />)
    expect(screen.getByText('亚太服')).toBeInTheDocument()
    expect(screen.getByText('美服')).toBeInTheDocument()
    expect(screen.getByText('欧服')).toBeInTheDocument()
    expect(screen.queryByText('AP')).not.toBeInTheDocument()
    expect(screen.queryByText('US')).not.toBeInTheDocument()
    expect(screen.queryByText('EU')).not.toBeInTheDocument()
  })

  it('should highlight current region', () => {
    mockServerRegion = 'america'
    render(<SettingsServer isEmbedded />)
    const americaButton = screen.getByText('美服').closest('button')!
    expect(americaButton.className).toContain('bg-primary-soft')
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
      DISPLAY_PREFERENCES_STORAGE_KEY,
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

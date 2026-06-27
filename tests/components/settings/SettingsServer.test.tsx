import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { SettingsServer } from '../../../src/components/settings/SettingsServer'

const mockUpdateSettings = vi.fn()
let mockServerRegion = 'asia'

vi.mock('../../../src/context/SettingsContext', () => ({
  useSettings: () => ({
    settings: { serverRegion: mockServerRegion, isAutoMoveEnabled: true, shouldConfirmDelete: true },
    updateSettings: mockUpdateSettings,
  }),
}))

describe('SettingsServer', () => {
  it('should render all server regions', () => {
    render(
      <SettingsServer
        isEmbedded
      />,
    )
    expect(screen.getByText('亚太服')).toBeInTheDocument()
    expect(screen.getByText('美服')).toBeInTheDocument()
    expect(screen.getByText('欧服')).toBeInTheDocument()
  })

  it('should highlight current region', () => {
    mockServerRegion = 'america'
    render(
      <SettingsServer
        isEmbedded
      />,
    )
    const americaButton = screen.getByText('美服').closest('button')!
    expect(americaButton.className).toContain('bg-primary-soft')
    mockServerRegion = 'asia'
  })

  it('should call updateSettings when region clicked', () => {
    mockUpdateSettings.mockClear()
    render(
      <SettingsServer
        isEmbedded
      />,
    )
    fireEvent.click(screen.getByText('欧服').closest('button')!)
    expect(mockUpdateSettings).toHaveBeenCalledWith({ serverRegion: 'europe' })
  })

  it('should render reset time info', () => {
    render(
      <SettingsServer
        isEmbedded
      />,
    )
    expect(screen.getByText(/每日·每周一·每月一日/)).toBeInTheDocument()
    expect(screen.getByText('5:00 AM')).toBeInTheDocument()
    expect(screen.getByText(/重置/)).toBeInTheDocument()
  })

  it('should not render back button when isEmbedded', () => {
    render(
      <SettingsServer
        isEmbedded
      />,
    )
    expect(screen.queryByLabelText('返回')).not.toBeInTheDocument()
  })
})

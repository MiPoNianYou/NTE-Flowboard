import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { SettingsGeneral } from '../../../src/components/settings/SettingsGeneral'

vi.mock('../../../src/context/SettingsContext', () => ({
  useSettings: () => ({
    settings: { serverRegion: 'asia', isAutoMoveEnabled: true, shouldConfirmDelete: true },
    updateSettings: mockUpdateSettings,
  }),
}))

const mockUpdateSettings = vi.fn()

describe('SettingsGeneral', () => {
  it('should render setting labels', () => {
    render(<SettingsGeneral isEmbedded />)
    expect(screen.getByText('完成任务自动置底')).toBeInTheDocument()
    expect(screen.getByText('删除二次确认')).toBeInTheDocument()
  })

  it('should call updateSettings when auto-move toggle clicked', () => {
    mockUpdateSettings.mockClear()
    render(<SettingsGeneral isEmbedded />)
    const switches = screen.getAllByRole('switch')
    fireEvent.click(switches[0])
    expect(mockUpdateSettings).toHaveBeenCalledWith({ isAutoMoveEnabled: false })
  })

  it('should call updateSettings when confirm-delete toggle clicked', () => {
    mockUpdateSettings.mockClear()
    render(<SettingsGeneral isEmbedded />)
    const switches = screen.getAllByRole('switch')
    fireEvent.click(switches[1])
    expect(mockUpdateSettings).toHaveBeenCalledWith({ shouldConfirmDelete: false })
  })

  it('should not render back button when isEmbedded', () => {
    render(<SettingsGeneral isEmbedded />)
    expect(screen.queryByLabelText('返回')).not.toBeInTheDocument()
  })

  it('should render back button when not isEmbedded', () => {
    const { container } = render(<SettingsGeneral onBack={vi.fn()} />)
    const buttons = container.querySelectorAll('button')
    expect(buttons.length).toBeGreaterThan(0)
  })
})

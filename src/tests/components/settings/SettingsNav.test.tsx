import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { SettingsNav, NAV_ITEMS } from '../../../components/settings/SettingsNav'
import i18n from '../../../i18n'

describe('SettingsNav', () => {
  const mockOnTabChange = vi.fn()

  it('should render all nav items', () => {
    render(<SettingsNav activeTab="general" onTabChange={mockOnTabChange} />)
    NAV_ITEMS.forEach((item) => {
      expect(screen.getByText(i18n.t(item.labelKey))).toBeInTheDocument()
    })
  })

  it('should call onTabChange when item clicked', () => {
    render(<SettingsNav activeTab="general" onTabChange={mockOnTabChange} />)
    fireEvent.click(screen.getByText('服务器设置'))
    expect(mockOnTabChange).toHaveBeenCalledWith('server')
  })

  it('should highlight the active tab', () => {
    render(<SettingsNav activeTab="cloud" onTabChange={mockOnTabChange} />)
    const cloudButton = screen.getByText('云同步').closest('button')!
    expect(cloudButton.className).toContain('bg-primary/5')
  })

  it('should show labels when provided', () => {
    const labels = { server: '亚太服', cloud: '已连接' }
    render(<SettingsNav activeTab="general" onTabChange={mockOnTabChange} labels={labels} />)
    expect(screen.getByText('亚太服')).toBeInTheDocument()
    expect(screen.getByText('已连接')).toBeInTheDocument()
  })

  it('keeps navigation titles and status labels on one line', () => {
    render(
      <SettingsNav
        activeTab="general"
        onTabChange={mockOnTabChange}
        labels={{ cloud: 'Not set' }}
      />,
    )

    expect(screen.getByText('云同步')).toHaveClass('whitespace-nowrap', 'shrink-0')
    expect(screen.getByText('Not set')).toHaveClass('whitespace-nowrap', 'shrink-0')
  })

  it('should not show labels for items without label', () => {
    const labels = { server: '亚太服' }
    render(<SettingsNav activeTab="general" onTabChange={mockOnTabChange} labels={labels} />)
    expect(screen.queryByText('亚太服')).toBeInTheDocument()
    expect(screen.queryByText('已连接')).not.toBeInTheDocument()
  })
})

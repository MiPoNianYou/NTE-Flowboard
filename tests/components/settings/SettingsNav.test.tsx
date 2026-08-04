import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { SettingsNav, NAV_ITEMS } from '../../../src/components/settings/SettingsNav'
import i18n from '../../../src/i18n'

describe('SettingsNav', () => {
  const mockOnTabChange = vi.fn()

  it('should render all destinations, optional statuses, and the active page', () => {
    render(
      <SettingsNav
        activeTab="cloud"
        onTabChange={mockOnTabChange}
        labels={{ server: '亚太服', cloud: '已连接' }}
        showNotifications
      />,
    )

    NAV_ITEMS.forEach((item) => {
      expect(screen.getByText(i18n.t(item.labelKey))).toBeInTheDocument()
    })
    expect(screen.getByText('亚太服')).toBeInTheDocument()
    expect(screen.getByText('已连接')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /云同步/ })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('button', { name: /通用/ })).not.toHaveAttribute('aria-current')
  })

  it('should call onTabChange when item clicked', () => {
    render(<SettingsNav activeTab="general" onTabChange={mockOnTabChange} />)
    fireEvent.click(screen.getByText('服务器设置'))
    expect(mockOnTabChange).toHaveBeenCalledWith('server')
  })

  it('places notifications between cloud sync and data management', () => {
    render(<SettingsNav activeTab="general" onTabChange={mockOnTabChange} showNotifications />)

    expect(screen.getAllByRole('button').map((button) => button.textContent)).toEqual([
      '通用',
      '服务器设置',
      '云同步',
      '通知',
      '数据管理',
    ])
  })

  it('hides the notification destination until the backend is configured', () => {
    render(<SettingsNav activeTab="general" onTabChange={mockOnTabChange} />)
    expect(screen.queryByText('通知')).not.toBeInTheDocument()
  })

  it('should render the mobile entry page without marking a destination current', () => {
    render(<SettingsNav activeTab={null} onTabChange={mockOnTabChange} showDisclosure />)

    expect(screen.getByRole('navigation')).toBeInTheDocument()
    screen
      .getAllByRole('button')
      .forEach((button) => expect(button).not.toHaveAttribute('aria-current'))
    expect(document.querySelectorAll('.lucide-chevron-right')).toHaveLength(NAV_ITEMS.length - 1)
  })
})

import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { TabSwitch } from '../../src/components/TabSwitch'

describe('TabSwitch', () => {
  it('should render daily and weekly tabs', () => {
    render(<TabSwitch activeTab="daily" onTabChange={vi.fn()} />)
    expect(screen.getByText('每日清单')).toBeInTheDocument()
    expect(screen.getByText('每周清单')).toBeInTheDocument()
  })

  it('should call onTabChange when tab is clicked', () => {
    const onTabChange = vi.fn()
    render(<TabSwitch activeTab="daily" onTabChange={onTabChange} />)
    fireEvent.click(screen.getByText('每周清单'))
    expect(onTabChange).toHaveBeenCalledWith('weekly')
  })

  it('should set aria-selected on active tab', () => {
    render(<TabSwitch activeTab="weekly" onTabChange={vi.fn()} />)
    const dailyTab = screen.getByText('每日清单').closest('[role="tab"]')!
    const weeklyTab = screen.getByText('每周清单').closest('[role="tab"]')!
    expect(dailyTab).toHaveAttribute('aria-selected', 'false')
    expect(weeklyTab).toHaveAttribute('aria-selected', 'true')
  })
})

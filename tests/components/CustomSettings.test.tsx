import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { CustomSettings } from '../../src/components/CustomSettings'

vi.mock('motion/react')

describe('CustomSettings', () => {
  it('should render name input', () => {
    render(
      <CustomSettings
        customName="我的清单"
        onCustomNameChange={vi.fn()}
        customResetMode="daily"
        onCustomResetModeChange={vi.fn()}
        isLayoutTransitioning={false}
      />,
    )
    const input = screen.getByPlaceholderText('自定义清单') as HTMLInputElement
    expect(input.value).toBe('我的清单')
  })

  it('should call onCustomNameChange when input changes', () => {
    const onChange = vi.fn()
    render(
      <CustomSettings
        customName=""
        onCustomNameChange={onChange}
        customResetMode="daily"
        onCustomResetModeChange={vi.fn()}
        isLayoutTransitioning={false}
      />,
    )
    const input = screen.getByPlaceholderText('自定义清单')
    fireEvent.change(input, { target: { value: '新名称' } })
    expect(onChange).toHaveBeenCalledWith('新名称')
  })

  it('should render reset mode buttons', () => {
    render(
      <CustomSettings
        customName=""
        onCustomNameChange={vi.fn()}
        customResetMode="daily"
        onCustomResetModeChange={vi.fn()}
        isLayoutTransitioning={false}
      />,
    )
    expect(screen.getByText('每日')).toBeInTheDocument()
    expect(screen.getByText('每周')).toBeInTheDocument()
  })

  it('should call onCustomResetModeChange when weekly clicked', () => {
    const onChange = vi.fn()
    render(
      <CustomSettings
        customName=""
        onCustomNameChange={vi.fn()}
        customResetMode="daily"
        onCustomResetModeChange={onChange}
        isLayoutTransitioning={false}
      />,
    )
    fireEvent.click(screen.getByText('每周'))
    expect(onChange).toHaveBeenCalledWith('weekly')
  })

  it('should call onCustomResetModeChange when daily clicked', () => {
    const onChange = vi.fn()
    render(
      <CustomSettings
        customName=""
        onCustomNameChange={vi.fn()}
        customResetMode="weekly"
        onCustomResetModeChange={onChange}
        isLayoutTransitioning={false}
      />,
    )
    fireEvent.click(screen.getByText('每日'))
    expect(onChange).toHaveBeenCalledWith('daily')
  })

  it('should default reset mode to daily when undefined', () => {
    render(
      <CustomSettings
        customName=""
        onCustomNameChange={vi.fn()}
        onCustomResetModeChange={vi.fn()}
        isLayoutTransitioning={false}
      />,
    )
    expect(screen.getByText('每日')).toBeInTheDocument()
  })
})

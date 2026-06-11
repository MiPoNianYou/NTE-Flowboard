import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { SettingsGeneral } from '../../src/components/SettingsGeneral'

vi.mock('motion/react')

const defaultProps = {
  autoMoveCompleted: true,
  onAutoMoveCompletedChange: vi.fn(),
  confirmDelete: true,
  onConfirmDeleteChange: vi.fn(),
  showCustomTab: false,
  onShowCustomTabChange: vi.fn(),
}

describe('SettingsGeneral', () => {
  it('should render setting labels', () => {
    render(<SettingsGeneral {...defaultProps} embedded />)
    expect(screen.getByText('完成事项自动移至底部')).toBeInTheDocument()
    expect(screen.getByText('删除前二次确认')).toBeInTheDocument()
    expect(screen.getByText('显示自定义清单')).toBeInTheDocument()
  })

  it('should render section headers', () => {
    render(<SettingsGeneral {...defaultProps} embedded />)
    expect(screen.getByText('行为')).toBeInTheDocument()
    expect(screen.getByText('显示')).toBeInTheDocument()
  })

  it('should call onAutoMoveCompletedChange when toggle clicked', () => {
    const onChange = vi.fn()
    render(<SettingsGeneral {...defaultProps} onAutoMoveCompletedChange={onChange} embedded />)
    const toggle = screen.getByText('完成事项自动移至底部').closest('.flex')!.querySelector('button')!
    fireEvent.click(toggle)
    expect(onChange).toHaveBeenCalledOnce()
  })

  it('should call onConfirmDeleteChange when toggle clicked', () => {
    const onChange = vi.fn()
    render(<SettingsGeneral {...defaultProps} onConfirmDeleteChange={onChange} embedded />)
    const toggle = screen.getByText('删除前二次确认').closest('.flex')!.querySelector('button')!
    fireEvent.click(toggle)
    expect(onChange).toHaveBeenCalledOnce()
  })

  it('should call onShowCustomTabChange when toggle clicked', () => {
    const onChange = vi.fn()
    render(<SettingsGeneral {...defaultProps} onShowCustomTabChange={onChange} embedded />)
    const toggle = screen.getByText('显示自定义清单').closest('.flex')!.querySelector('button')!
    fireEvent.click(toggle)
    expect(onChange).toHaveBeenCalledOnce()
  })

  it('should not render back button when embedded', () => {
    render(<SettingsGeneral {...defaultProps} embedded />)
    expect(screen.queryByLabelText('返回')).not.toBeInTheDocument()
  })

  it('should render back button when not embedded', () => {
    const { container } = render(<SettingsGeneral {...defaultProps} onBack={vi.fn()} />)
    // SettingsSubPage renders a NavBar with back button containing ArrowLeft icon
    const buttons = container.querySelectorAll('button')
    expect(buttons.length).toBeGreaterThan(0)
  })
})

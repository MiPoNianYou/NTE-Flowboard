import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { ConfirmDialog } from '../../src/components/ConfirmDialog'

vi.mock('motion/react')

describe('ConfirmDialog', () => {
  it('should render title and description when open', () => {
    render(
      <ConfirmDialog
        open={true}
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
        icon={<span></span>}
        iconBg="bg-warning-soft"
        title="确认删除"
        description="确定要删除吗？"
        confirmLabel="删除"
      />,
    )
    expect(screen.getByText('确认删除')).toBeInTheDocument()
    expect(screen.getByText('确定要删除吗？')).toBeInTheDocument()
  })

  it('should not render when open is false', () => {
    render(
      <ConfirmDialog
        open={false}
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
        icon={<span></span>}
        iconBg="bg-warning-soft"
        title="确认删除"
        description="确定要删除吗？"
        confirmLabel="删除"
      />,
    )
    expect(screen.queryByText('确认删除')).not.toBeInTheDocument()
  })

  it('should call onConfirm when confirm button is clicked', () => {
    const onConfirm = vi.fn()
    render(
      <ConfirmDialog
        open={true}
        onCancel={vi.fn()}
        onConfirm={onConfirm}
        icon={<span></span>}
        iconBg="bg-warning-soft"
        title="确认"
        description="描述"
        confirmLabel="确定"
      />,
    )
    fireEvent.click(screen.getByText('确定'))
    expect(onConfirm).toHaveBeenCalledOnce()
  })

  it('should call onCancel when cancel button is clicked', () => {
    const onCancel = vi.fn()
    render(
      <ConfirmDialog
        open={true}
        onCancel={onCancel}
        onConfirm={vi.fn()}
        icon={<span></span>}
        iconBg="bg-warning-soft"
        title="确认"
        description="描述"
        confirmLabel="确定"
      />,
    )
    fireEvent.click(screen.getByText('取消'))
    expect(onCancel).toHaveBeenCalledOnce()
  })

  it('should call onCancel when Escape is pressed', () => {
    const onCancel = vi.fn()
    render(
      <ConfirmDialog
        open={true}
        onCancel={onCancel}
        onConfirm={vi.fn()}
        icon={<span></span>}
        iconBg="bg-warning-soft"
        title="确认"
        description="描述"
        confirmLabel="确定"
      />,
    )
    fireEvent.keyDown(screen.getByText('确认').closest('[role="dialog"]')!, { key: 'Escape' })
    expect(onCancel).toHaveBeenCalledOnce()
  })

  it('should render confirmLabel on confirm button', () => {
    render(
      <ConfirmDialog
        open={true}
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
        icon={<span></span>}
        iconBg="bg-warning-soft"
        title="确认"
        description="描述"
        confirmLabel="删除此项"
      />,
    )
    expect(screen.getByText('删除此项')).toBeInTheDocument()
  })
})

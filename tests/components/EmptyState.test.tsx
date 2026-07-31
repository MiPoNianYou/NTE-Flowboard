import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { EmptyState } from '../../src/components/EmptyState'

describe('EmptyState', () => {
  it('renders the supplied content and action', () => {
    const onAction = vi.fn()

    render(
      <EmptyState
        title="No tasks"
        subtitle="Everything is complete"
        action={<button onClick={onAction}>Add task</button>}
      />,
    )

    expect(screen.getByText('No tasks')).toBeInTheDocument()
    expect(screen.getByText('Everything is complete')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Add task' }))
    expect(onAction).toHaveBeenCalledOnce()
  })

  it('selects a translated fallback subtitle once', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)

    const { rerender } = render(<EmptyState title="暂无任务" />)

    expect(screen.getByText('早上好！有新的委托吗？柯林斯家族随时可以出发！')).toBeInTheDocument()
    rerender(<EmptyState title="任务已完成" />)
    expect(screen.getByText('早上好！有新的委托吗？柯林斯家族随时可以出发！')).toBeInTheDocument()
  })
})

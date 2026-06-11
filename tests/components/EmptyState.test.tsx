import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { EmptyState } from '../../src/components/EmptyState'

vi.mock('motion/react')

describe('EmptyState', () => {
  it('should render title', () => {
    render(<EmptyState title="暂无事项" subtitle="添加一个试试" />)
    expect(screen.getByText('暂无事项')).toBeInTheDocument()
  })

  it('should render subtitle', () => {
    render(<EmptyState title="暂无事项" subtitle="添加一个试试" />)
    expect(screen.getByText('添加一个试试')).toBeInTheDocument()
  })

  it('should render SVG clipboard icon', () => {
    const { container } = render(<EmptyState title="" subtitle="" />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('should have centered layout', () => {
    const { container } = render(<EmptyState title="" subtitle="" />)
    const wrapper = container.firstChild as HTMLElement
    expect(wrapper.className).toContain('flex-col')
    expect(wrapper.className).toContain('items-center')
  })
})

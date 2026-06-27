import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { TagPill } from '../../src/components/TagPill'

vi.mock('../../src/utils/tagColors', () => ({
  getTagColors: vi.fn(() => ({ text: '#EF4444', backgroundColor: '#ef444424' })),
}))

describe('TagPill', () => {
  it('should render tag text', () => {
    render(<TagPill tag="测试标签" />)
    expect(screen.getByText('测试标签')).toBeInTheDocument()
  })

  it('should apply color styles from getTagColors', () => {
    render(<TagPill tag="地图" />)
    const span = screen.getByText('地图')
    expect(span).toHaveStyle({ color: '#EF4444', backgroundColor: '#ef444424' })
  })

  it('should not show remove button when onRemove is not provided', () => {
    render(<TagPill tag="地图" />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('should show remove button when onRemove is provided', () => {
    render(<TagPill tag="地图" onRemove={vi.fn()} />)
    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  it('should call onRemove when X button is clicked', () => {
    const onRemove = vi.fn()
    render(<TagPill tag="地图" onRemove={onRemove} />)
    fireEvent.click(screen.getByRole('button'))
    expect(onRemove).toHaveBeenCalledOnce()
  })
})

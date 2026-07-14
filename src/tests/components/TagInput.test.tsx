import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { TagInput } from '../../components/TagInput'

vi.mock('../../utils/tagColors', () => ({
  getTagColors: vi.fn(() => ({ text: '#EF4444', backgroundColor: '#ef444424' })),
}))

describe('TagInput', () => {
  it('should show "标签" button when no input is open', () => {
    render(<TagInput tags={[]} onChange={vi.fn()} />)
    expect(screen.getByText('标签')).toBeInTheDocument()
  })

  it('should show input when "标签" button is clicked', () => {
    render(<TagInput tags={[]} onChange={vi.fn()} />)
    fireEvent.click(screen.getByText('标签'))
    expect(screen.getByPlaceholderText('标签名')).toBeInTheDocument()
  })

  it('should use the compact focus style when requested', () => {
    render(<TagInput tags={[]} onChange={vi.fn()} compactFocus />)
    fireEvent.click(screen.getByText('标签'))

    expect(screen.getByPlaceholderText('标签名')).toHaveClass(
      'rounded-full',
      'focus:ring-1',
      'focus:ring-offset-0',
    )
  })

  it('should add tag on Enter', () => {
    const onChange = vi.fn()
    render(<TagInput tags={[]} onChange={onChange} />)
    fireEvent.click(screen.getByText('标签'))
    const input = screen.getByPlaceholderText('标签名')
    fireEvent.change(input, { target: { value: '地图' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(onChange).toHaveBeenCalledWith(['地图'])
  })

  it('should not add duplicate tags', () => {
    const onChange = vi.fn()
    render(<TagInput tags={['地图']} onChange={onChange} />)
    fireEvent.click(screen.getByText('标签'))
    const input = screen.getByPlaceholderText('标签名')
    fireEvent.change(input, { target: { value: '地图' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(onChange).not.toHaveBeenCalled()
  })

  it('should remove tag when X is clicked', () => {
    const onChange = vi.fn()
    render(<TagInput tags={['地图', '大亨']} onChange={onChange} />)
    const removeButtons = screen.getAllByRole('button')
    fireEvent.click(removeButtons[0])
    expect(onChange).toHaveBeenCalledWith(['大亨'])
  })

  it('should show count when limit is provided', () => {
    render(<TagInput tags={['a']} onChange={vi.fn()} limit={3} />)
    expect(screen.getByText('1/3')).toBeInTheDocument()
  })

  it('should disable button when at limit', () => {
    render(<TagInput tags={['a', 'b']} onChange={vi.fn()} limit={2} />)
    const button = screen.getByText('标签').closest('button')!
    expect(button).toBeDisabled()
  })
})

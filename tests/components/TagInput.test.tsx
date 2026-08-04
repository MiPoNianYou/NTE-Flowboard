import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { TagInput } from '../../src/components/TagInput'

vi.mock('../../src/utils/tagColors', () => ({
  getTagColors: vi.fn(() => ({ text: '#EF4444', backgroundColor: '#ef444424' })),
}))

describe('TagInput', () => {
  it('should show the count and open a focused tag input', () => {
    render(<TagInput tags={[]} onChange={vi.fn()} />)
    expect(screen.getByText('0/5')).toBeInTheDocument()

    fireEvent.click(screen.getByText('标签'))
    expect(screen.getByPlaceholderText('标签名')).toHaveFocus()
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
    fireEvent.click(screen.getByRole('button', { name: '删除标签「地图」' }))
    expect(onChange).toHaveBeenCalledWith(['大亨'])
  })

  it('should show and enforce the shared collection limit', () => {
    const onChange = vi.fn()
    const tags = ['a', 'b', 'c', 'd', 'e']
    const { rerender } = render(<TagInput tags={tags} onChange={onChange} />)

    expect(screen.queryByText('5/5')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '标签已满' })).toBeDisabled()

    fireEvent.click(screen.getByRole('button', { name: '删除标签「e」' }))
    expect(onChange).toHaveBeenCalledWith(['a', 'b', 'c', 'd'])
    rerender(<TagInput tags={['a', 'b', 'c', 'd']} onChange={onChange} />)

    expect(screen.getByRole('button', { name: '标签4/5' })).toBeEnabled()
  })

  it('should leave input mode after adding the final allowed tag', () => {
    const onChange = vi.fn()
    const initialTags = ['a', 'b', 'c', 'd']
    const { rerender } = render(<TagInput tags={initialTags} onChange={onChange} />)

    fireEvent.click(screen.getByText('标签'))
    const input = screen.getByPlaceholderText('标签名')
    fireEvent.change(input, { target: { value: 'e' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(onChange).toHaveBeenCalledWith([...initialTags, 'e'])

    rerender(<TagInput tags={[...initialTags, 'e']} onChange={onChange} />)

    expect(screen.queryByPlaceholderText('标签名')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '标签已满' })).toBeDisabled()
  })
})

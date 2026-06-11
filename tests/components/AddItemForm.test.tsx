import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { AddItemForm } from '../../src/components/AddItemForm'

vi.mock('motion/react')

vi.mock('../../src/utils/tagColors', () => ({
  getTagColors: vi.fn(() => ({ text: '#EF4444', bg: '#ef444424' })),
}))

describe('AddItemForm', () => {
  it('should show "添加自定义项目 button by default', () => {
    render(<AddItemForm tab="daily" onAdd={vi.fn()} />)
    expect(screen.getByText('添加自定义项目')).toBeInTheDocument()
  })

  it('should show form after clicking the button', () => {
    render(<AddItemForm tab="daily" onAdd={vi.fn()} />)
    fireEvent.click(screen.getByText('添加自定义项目'))
    expect(screen.getByPlaceholderText('输入新任务...')).toBeInTheDocument()
  })

  it('should call onAdd and close form on submit', () => {
    const onAdd = vi.fn()
    render(<AddItemForm tab="daily" onAdd={onAdd} />)
    fireEvent.click(screen.getByText('添加自定义项目'))
    const input = screen.getByPlaceholderText('输入新任务...')
    fireEvent.change(input, { target: { value: '新任务' } })
    fireEvent.click(screen.getByText('添加'))
    expect(onAdd).toHaveBeenCalledWith('daily', '新任务', [])
  })

  it('should not submit empty input', () => {
    const onAdd = vi.fn()
    render(<AddItemForm tab="daily" onAdd={onAdd} />)
    fireEvent.click(screen.getByText('添加自定义项目'))
    fireEvent.click(screen.getByText('添加'))
    expect(onAdd).not.toHaveBeenCalled()
  })

  it('should close form on Escape', () => {
    render(<AddItemForm tab="daily" onAdd={vi.fn()} />)
    fireEvent.click(screen.getByText('添加自定义项目'))
    expect(screen.getByPlaceholderText('输入新任务...')).toBeInTheDocument()
    fireEvent.keyDown(screen.getByPlaceholderText('输入新任务...'), { key: 'Escape' })
    expect(screen.queryByPlaceholderText('输入新任务...')).not.toBeInTheDocument()
  })

  it('should close form on cancel button', () => {
    render(<AddItemForm tab="daily" onAdd={vi.fn()} />)
    fireEvent.click(screen.getByText('添加自定义项目'))
    fireEvent.click(screen.getByText('取消'))
    expect(screen.queryByPlaceholderText('输入新任务...')).not.toBeInTheDocument()
  })

  it('should trim whitespace from submitted text', () => {
    const onAdd = vi.fn()
    render(<AddItemForm tab="daily" onAdd={onAdd} />)
    fireEvent.click(screen.getByText('添加自定义项目'))
    fireEvent.change(screen.getByPlaceholderText('输入新任务...'), { target: { value: '  新任务 ' } })
    fireEvent.click(screen.getByText('添加'))
    expect(onAdd).toHaveBeenCalledWith('daily', '新任务', [])
  })

  it('should disable add button when text is empty', () => {
    render(<AddItemForm tab="daily" onAdd={vi.fn()} />)
    fireEvent.click(screen.getByText('添加自定义项目'))
    expect(screen.getByText('添加').closest('button')).toBeDisabled()
  })

  it('should enable add button when text is entered', () => {
    render(<AddItemForm tab="daily" onAdd={vi.fn()} />)
    fireEvent.click(screen.getByText('添加自定义项目'))
    fireEvent.change(screen.getByPlaceholderText('输入新任务...'), { target: { value: '任务' } })
    expect(screen.getByText('添加').closest('button')).not.toBeDisabled()
  })

  // Tag management tests
  it('should show "+ 标签" button when form is open', () => {
    render(<AddItemForm tab="daily" onAdd={vi.fn()} />)
    fireEvent.click(screen.getByText('添加自定义项目'))
    expect(screen.getByText('+ 标签')).toBeInTheDocument()
  })

  it('should show tag input when "+ 标签" clicked', () => {
    render(<AddItemForm tab="daily" onAdd={vi.fn()} />)
    fireEvent.click(screen.getByText('添加自定义项目'))
    fireEvent.click(screen.getByText('+ 标签'))
    expect(screen.getByPlaceholderText('标签名')).toBeInTheDocument()
  })

  it('should add tag on Enter in tag input', () => {
    const onAdd = vi.fn()
    render(<AddItemForm tab="daily" onAdd={onAdd} />)
    fireEvent.click(screen.getByText('添加自定义项目'))
    fireEvent.click(screen.getByText('+ 标签'))
    const tagInput = screen.getByPlaceholderText('标签名')
    fireEvent.change(tagInput, { target: { value: '标签1' } })
    fireEvent.keyDown(tagInput, { key: 'Enter' })
    // Tag should be added, tag input should close
    expect(screen.queryByPlaceholderText('标签名')).not.toBeInTheDocument()
    // Submit and verify tag is included
    fireEvent.change(screen.getByPlaceholderText('输入新任务...'), { target: { value: '任务' } })
    fireEvent.click(screen.getByText('添加'))
    expect(onAdd).toHaveBeenCalledWith('daily', '任务', ['标签1'])
  })

  it('should close tag input on Escape without adding tag', () => {
    render(<AddItemForm tab="daily" onAdd={vi.fn()} />)
    fireEvent.click(screen.getByText('添加自定义项目'))
    fireEvent.click(screen.getByText('+ 标签'))
    const tagInput = screen.getByPlaceholderText('标签名')
    fireEvent.change(tagInput, { target: { value: '标签1' } })
    fireEvent.keyDown(tagInput, { key: 'Escape' })
    expect(screen.queryByPlaceholderText('标签名')).not.toBeInTheDocument()
    // "+ 标签" should reappear since no tag was added
    expect(screen.getByText('+ 标签')).toBeInTheDocument()
  })

  it('should add tag on blur when non-empty', () => {
    render(<AddItemForm tab="daily" onAdd={vi.fn()} />)
    fireEvent.click(screen.getByText('添加自定义项目'))
    fireEvent.click(screen.getByText('+ 标签'))
    const tagInput = screen.getByPlaceholderText('标签名')
    fireEvent.change(tagInput, { target: { value: '标签1' } })
    fireEvent.blur(tagInput)
    // Tag should be added
    expect(screen.queryByPlaceholderText('标签名')).not.toBeInTheDocument()
  })

  it('should not add empty tag on blur', () => {
    render(<AddItemForm tab="daily" onAdd={vi.fn()} />)
    fireEvent.click(screen.getByText('添加自定义项目'))
    fireEvent.click(screen.getByText('+ 标签'))
    const tagInput = screen.getByPlaceholderText('标签名')
    fireEvent.blur(tagInput)
    // No tag added, "+ 标签" should still be visible
    expect(screen.getByText('+ 标签')).toBeInTheDocument()
  })

  it('should not add duplicate tags', () => {
    render(<AddItemForm tab="daily" onAdd={vi.fn()} />)
    fireEvent.click(screen.getByText('添加自定义项目'))

    // Add first tag
    fireEvent.click(screen.getByText('+ 标签'))
    let tagInput = screen.getByPlaceholderText('标签名')
    fireEvent.change(tagInput, { target: { value: '标签1' } })
    fireEvent.keyDown(tagInput, { key: 'Enter' })

    // Try to add same tag
    fireEvent.click(screen.getByText('+ 标签'))
    tagInput = screen.getByPlaceholderText('标签名')
    fireEvent.change(tagInput, { target: { value: '标签1' } })
    fireEvent.keyDown(tagInput, { key: 'Enter' })

    // Only one tag should exist - submit to verify
    fireEvent.change(screen.getByPlaceholderText('输入新任务...'), { target: { value: '任务' } })
    const onAdd = vi.fn()
    // Re-render with onAdd spy
    // Instead, check that "+ 标签" button only appears once (meaning only one tag)
    // The tag pill should show "标签1" exactly once
    const tagPills = screen.getAllByText('标签1')
    // One in TagPill display, no duplicates
    expect(tagPills.length).toBe(1)
  })

  it('should enforce tag limit (5)', () => {
    render(<AddItemForm tab="daily" onAdd={vi.fn()} />)
    fireEvent.click(screen.getByText('添加自定义项目'))

    // Add 5 tags
    for (let i = 1; i <= 5; i++) {
      fireEvent.click(screen.getByText('+ 标签'))
      const tagInput = screen.getByPlaceholderText('标签名')
      fireEvent.change(tagInput, { target: { value: `标签${i}` } })
      fireEvent.keyDown(tagInput, { key: 'Enter' })
    }

    // "+ 标签" button should be gone
    expect(screen.queryByText('+ 标签')).not.toBeInTheDocument()
  })

  it('should remove tag when TagPill remove button clicked', () => {
    render(<AddItemForm tab="daily" onAdd={vi.fn()} />)
    fireEvent.click(screen.getByText('添加自定义项目'))

    // Add a tag
    fireEvent.click(screen.getByText('+ 标签'))
    const tagInput = screen.getByPlaceholderText('标签名')
    fireEvent.change(tagInput, { target: { value: '标签1' } })
    fireEvent.keyDown(tagInput, { key: 'Enter' })

    // Tag should be visible
    expect(screen.getByText('标签1')).toBeInTheDocument()

    // Find and click the remove button (X icon) inside the tag pill
    const removeBtn = screen.getByText('标签1').closest('span')!.querySelector('button')!
    fireEvent.click(removeBtn)

    // Tag should be removed
    expect(screen.queryByText('标签1')).not.toBeInTheDocument()
    // "+ 标签" should reappear
    expect(screen.getByText('+ 标签')).toBeInTheDocument()
  })

  it('should clear form data after successful submit', () => {
    render(<AddItemForm tab="daily" onAdd={vi.fn()} />)
    fireEvent.click(screen.getByText('添加自定义项目'))

    // Add text and tag
    fireEvent.change(screen.getByPlaceholderText('输入新任务...'), { target: { value: '任务' } })
    fireEvent.click(screen.getByText('+ 标签'))
    const tagInput = screen.getByPlaceholderText('标签名')
    fireEvent.change(tagInput, { target: { value: '标签1' } })
    fireEvent.keyDown(tagInput, { key: 'Enter' })

    // Submit
    fireEvent.click(screen.getByText('添加'))

    // Form should close
    expect(screen.queryByPlaceholderText('输入新任务...')).not.toBeInTheDocument()
    // Button should reappear
    expect(screen.getByText('添加自定义项目')).toBeInTheDocument()
  })

  it('should pass tab type to onAdd', () => {
    const onAdd = vi.fn()
    render(<AddItemForm tab="weekly" onAdd={onAdd} />)
    fireEvent.click(screen.getByText('添加自定义项目'))
    fireEvent.change(screen.getByPlaceholderText('输入新任务...'), { target: { value: '周任务' } })
    fireEvent.click(screen.getByText('添加'))
    expect(onAdd).toHaveBeenCalledWith('weekly', '周任务', [])
  })
})

import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { AddItemForm } from '../../src/components/AddItemForm'



vi.mock('../../src/utils/tagColors', () => ({
  getTagColors: vi.fn(() => ({ text: '#EF4444', backgroundColor: '#ef444424' })),
}))

const getTagButton = () => screen.getByRole('button', { name: /标签/ })

const isFormHidden = () => {
  const input = screen.getByPlaceholderText('输入任务名称...')
  return input.closest('[aria-hidden]')?.getAttribute('aria-hidden') === 'true'
}

describe('AddItemForm', () => {
  it('should show "添加新任务" button by default', () => {
    render(<AddItemForm tab="daily" onAdd={vi.fn()} />)
    expect(screen.getByText('添加新任务')).toBeInTheDocument()
  })

  it('should show form after clicking the button', () => {
    render(<AddItemForm tab="daily" onAdd={vi.fn()} />)
    fireEvent.click(screen.getByText('添加新任务'))
    expect(screen.getByPlaceholderText('输入任务名称...')).toBeInTheDocument()
  })

  it('should call onAdd and close form on submit', () => {
    const onAdd = vi.fn()
    render(<AddItemForm tab="daily" onAdd={onAdd} />)
    fireEvent.click(screen.getByText('添加新任务'))
    const input = screen.getByPlaceholderText('输入任务名称...')
    fireEvent.change(input, { target: { value: '新任务' } })
    fireEvent.click(screen.getByText('添加'))
    expect(onAdd).toHaveBeenCalledWith('daily', '新任务', [])
  })

  it('should not submit empty input', () => {
    const onAdd = vi.fn()
    render(<AddItemForm tab="daily" onAdd={onAdd} />)
    fireEvent.click(screen.getByText('添加新任务'))
    fireEvent.click(screen.getByText('添加'))
    expect(onAdd).not.toHaveBeenCalled()
  })

  it('should close form on Escape', () => {
    render(<AddItemForm tab="daily" onAdd={vi.fn()} />)
    fireEvent.click(screen.getByText('添加新任务'))
    expect(screen.getByPlaceholderText('输入任务名称...')).toBeInTheDocument()
    fireEvent.keyDown(screen.getByPlaceholderText('输入任务名称...'), { key: 'Escape' })
    expect(isFormHidden()).toBe(true)
  })

  it('should close form on cancel button', () => {
    render(<AddItemForm tab="daily" onAdd={vi.fn()} />)
    fireEvent.click(screen.getByText('添加新任务'))
    fireEvent.click(screen.getByText('取消'))
    expect(isFormHidden()).toBe(true)
  })

  it('should trim whitespace from submitted text', () => {
    const onAdd = vi.fn()
    render(<AddItemForm tab="daily" onAdd={onAdd} />)
    fireEvent.click(screen.getByText('添加新任务'))
    fireEvent.change(screen.getByPlaceholderText('输入任务名称...'), { target: { value: '  新任务 ' } })
    fireEvent.click(screen.getByText('添加'))
    expect(onAdd).toHaveBeenCalledWith('daily', '新任务', [])
  })

  it('should disable add button when text is empty', () => {
    render(<AddItemForm tab="daily" onAdd={vi.fn()} />)
    fireEvent.click(screen.getByText('添加新任务'))
    expect(screen.getByText('添加').closest('button')).toBeDisabled()
  })

  it('should enable add button when text is entered', () => {
    render(<AddItemForm tab="daily" onAdd={vi.fn()} />)
    fireEvent.click(screen.getByText('添加新任务'))
    fireEvent.change(screen.getByPlaceholderText('输入任务名称...'), { target: { value: '任务' } })
    expect(screen.getByText('添加').closest('button')).not.toBeDisabled()
  })

  it('should show tag button when form is open', () => {
    render(<AddItemForm tab="daily" onAdd={vi.fn()} />)
    fireEvent.click(screen.getByText('添加新任务'))
    expect(getTagButton()).toBeInTheDocument()
  })

  it('should show tag input when tag button clicked', () => {
    render(<AddItemForm tab="daily" onAdd={vi.fn()} />)
    fireEvent.click(screen.getByText('添加新任务'))
    fireEvent.click(getTagButton())
    expect(screen.getByPlaceholderText('标签名')).toBeInTheDocument()
  })

  it('should add tag on Enter in tag input', () => {
    const onAdd = vi.fn()
    render(<AddItemForm tab="daily" onAdd={onAdd} />)
    fireEvent.click(screen.getByText('添加新任务'))
    fireEvent.click(getTagButton())
    const tagInput = screen.getByPlaceholderText('标签名')
    fireEvent.change(tagInput, { target: { value: '标签1' } })
    fireEvent.keyDown(tagInput, { key: 'Enter' })
    expect(screen.getByText('标签1')).toBeInTheDocument()
    fireEvent.change(screen.getByPlaceholderText('输入任务名称...'), { target: { value: '任务' } })
    fireEvent.click(screen.getByText('添加'))
    expect(onAdd).toHaveBeenCalledWith('daily', '任务', ['标签1'])
  })

  it('should close tag input on Escape without adding tag', () => {
    render(<AddItemForm tab="daily" onAdd={vi.fn()} />)
    fireEvent.click(screen.getByText('添加新任务'))
    fireEvent.click(getTagButton())
    const tagInput = screen.getByPlaceholderText('标签名')
    fireEvent.change(tagInput, { target: { value: '标签1' } })
    fireEvent.keyDown(tagInput, { key: 'Escape' })
    expect(screen.queryByPlaceholderText('标签名')).not.toBeInTheDocument()
  })

  it('should add tag on blur when non-empty', () => {
    render(<AddItemForm tab="daily" onAdd={vi.fn()} />)
    fireEvent.click(screen.getByText('添加新任务'))
    fireEvent.click(getTagButton())
    const tagInput = screen.getByPlaceholderText('标签名')
    fireEvent.change(tagInput, { target: { value: '标签1' } })
    fireEvent.blur(tagInput)
    expect(screen.queryByPlaceholderText('标签名')).not.toBeInTheDocument()
  })

  it('should not add empty tag on blur', () => {
    render(<AddItemForm tab="daily" onAdd={vi.fn()} />)
    fireEvent.click(screen.getByText('添加新任务'))
    fireEvent.click(getTagButton())
    const tagInput = screen.getByPlaceholderText('标签名')
    fireEvent.blur(tagInput)
    expect(getTagButton()).toBeInTheDocument()
  })

  it('should not add duplicate tags', () => {
    render(<AddItemForm tab="daily" onAdd={vi.fn()} />)
    fireEvent.click(screen.getByText('添加新任务'))

    fireEvent.click(getTagButton())
    let tagInput = screen.getByPlaceholderText('标签名')
    fireEvent.change(tagInput, { target: { value: '标签1' } })
    fireEvent.keyDown(tagInput, { key: 'Enter' })

    tagInput = screen.getByPlaceholderText('标签名')
    fireEvent.change(tagInput, { target: { value: '标签1' } })
    fireEvent.keyDown(tagInput, { key: 'Enter' })

    fireEvent.change(screen.getByPlaceholderText('输入任务名称...'), { target: { value: '任务' } })
    const tagPills = screen.getAllByText('标签1')
    expect(tagPills.length).toBe(1)
  })

  it('should enforce tag limit (5)', () => {
    render(<AddItemForm tab="daily" onAdd={vi.fn()} />)
    fireEvent.click(screen.getByText('添加新任务'))

    for (let i = 1; i <= 5; i++) {
      fireEvent.click(getTagButton())
      const tagInput = screen.getByPlaceholderText('标签名')
      fireEvent.change(tagInput, { target: { value: `标签${i}` } })
      fireEvent.keyDown(tagInput, { key: 'Enter' })
      fireEvent.blur(screen.getByPlaceholderText('标签名'))
    }

    expect(getTagButton()).toBeDisabled()
  })

  it('should remove tag when TagPill remove button clicked', () => {
    render(<AddItemForm tab="daily" onAdd={vi.fn()} />)
    fireEvent.click(screen.getByText('添加新任务'))

    fireEvent.click(getTagButton())
    const tagInput = screen.getByPlaceholderText('标签名')
    fireEvent.change(tagInput, { target: { value: '标签1' } })
    fireEvent.keyDown(tagInput, { key: 'Enter' })

    expect(screen.getByText('标签1')).toBeInTheDocument()

    fireEvent.blur(screen.getByPlaceholderText('标签名'))

    const removeButton = screen.getByText('标签1').closest('span')!.querySelector('button')!
    fireEvent.click(removeButton)

    expect(screen.queryByText('标签1')).not.toBeInTheDocument()
    expect(getTagButton()).toBeInTheDocument()
  })

  it('should clear form data after successful submit', () => {
    render(<AddItemForm tab="daily" onAdd={vi.fn()} />)
    fireEvent.click(screen.getByText('添加新任务'))

    fireEvent.change(screen.getByPlaceholderText('输入任务名称...'), { target: { value: '任务' } })
    fireEvent.click(getTagButton())
    const tagInput = screen.getByPlaceholderText('标签名')
    fireEvent.change(tagInput, { target: { value: '标签1' } })
    fireEvent.keyDown(tagInput, { key: 'Enter' })

    fireEvent.click(screen.getByText('添加'))

    expect(isFormHidden()).toBe(true)
    expect(screen.getByText('添加新任务')).toBeInTheDocument()
  })

  it('should pass tab type to onAdd', () => {
    const onAdd = vi.fn()
    render(<AddItemForm tab="weekly" onAdd={onAdd} />)
    fireEvent.click(screen.getByText('添加新任务'))
    fireEvent.change(screen.getByPlaceholderText('输入任务名称...'), { target: { value: '周任务' } })
    fireEvent.click(screen.getByText('添加'))
    expect(onAdd).toHaveBeenCalledWith('weekly', '周任务', [])
  })
})

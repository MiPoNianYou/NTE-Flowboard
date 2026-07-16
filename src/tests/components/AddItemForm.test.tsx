import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { AddItemForm } from '../../components/AddItemForm'

vi.mock('../../utils/tagColors', () => ({
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
    fireEvent.change(screen.getByPlaceholderText('输入任务名称...'), {
      target: { value: '  新任务 ' },
    })
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
    fireEvent.change(screen.getByPlaceholderText('输入任务名称...'), {
      target: { value: '周任务' },
    })
    fireEvent.click(screen.getByText('添加'))
    expect(onAdd).toHaveBeenCalledWith('weekly', '周任务', [])
  })
})

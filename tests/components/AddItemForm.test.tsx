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
  it('should open the initially hidden form and focus its input', () => {
    render(<AddItemForm tab="daily" onAdd={vi.fn()} />)
    expect(screen.getByText('添加新任务')).toBeInTheDocument()
    expect(isFormHidden()).toBe(true)

    fireEvent.click(screen.getByText('添加新任务'))
    expect(isFormHidden()).toBe(false)
    expect(screen.getByPlaceholderText('输入任务名称...')).toHaveFocus()
  })

  it('should submit trimmed text, tags, and tab, then clear the form', () => {
    const onAdd = vi.fn()
    render(<AddItemForm tab="weekly" onAdd={onAdd} />)
    fireEvent.click(screen.getByText('添加新任务'))
    const input = screen.getByPlaceholderText('输入任务名称...')
    fireEvent.change(input, { target: { value: '  周任务  ' } })
    fireEvent.click(getTagButton())
    const tagInput = screen.getByPlaceholderText('标签名')
    fireEvent.change(tagInput, { target: { value: '标签1' } })
    fireEvent.keyDown(tagInput, { key: 'Enter' })
    fireEvent.click(screen.getByText('添加'))

    expect(onAdd).toHaveBeenCalledWith('weekly', '周任务', ['标签1'])
    expect(isFormHidden()).toBe(true)
    fireEvent.click(screen.getByText('添加新任务'))
    expect(input).toHaveValue('')
    expect(screen.queryByText('标签1')).not.toBeInTheDocument()
  })

  it('should reject blank text and keep the submit button disabled', () => {
    const onAdd = vi.fn()
    render(<AddItemForm tab="daily" onAdd={onAdd} />)
    fireEvent.click(screen.getByText('添加新任务'))
    const input = screen.getByPlaceholderText('输入任务名称...')
    const submit = screen.getByText('添加').closest('button')!

    expect(submit).toBeDisabled()
    fireEvent.change(input, { target: { value: '   ' } })
    expect(submit).toBeDisabled()
    fireEvent.submit(input.closest('form')!)
    expect(onAdd).not.toHaveBeenCalled()
  })

  it.each(['escape', 'cancel'])('should clear and close the form via %s', (method) => {
    render(<AddItemForm tab="daily" onAdd={vi.fn()} />)
    fireEvent.click(screen.getByText('添加新任务'))
    const input = screen.getByPlaceholderText('输入任务名称...')
    fireEvent.change(input, { target: { value: '待取消' } })

    if (method === 'escape') fireEvent.keyDown(input, { key: 'Escape' })
    else fireEvent.click(screen.getByText('取消'))

    expect(isFormHidden()).toBe(true)
    fireEvent.click(screen.getByText('添加新任务'))
    expect(input).toHaveValue('')
  })

  it('should not close on Escape during text composition', () => {
    render(<AddItemForm tab="daily" onAdd={vi.fn()} />)
    fireEvent.click(screen.getByText('添加新任务'))
    const input = screen.getByPlaceholderText('输入任务名称...')

    fireEvent.compositionStart(input)
    fireEvent.keyDown(input, { key: 'Escape' })
    expect(isFormHidden()).toBe(false)

    fireEvent.compositionEnd(input)
    fireEvent.keyDown(input, { key: 'Escape' })
    expect(isFormHidden()).toBe(true)
  })
})

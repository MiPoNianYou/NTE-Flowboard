import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { Input } from '../../../src/components/base/Input'

describe('Input', () => {
  it('should render with placeholder', () => {
    render(<Input placeholder="请输入..." />)
    expect(screen.getByPlaceholderText('请输入...')).toBeInTheDocument()
  })

  it('should call onChange when typing', () => {
    const onChange = vi.fn()
    render(<Input onChange={onChange} />)
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'test' } })
    expect(onChange).toHaveBeenCalled()
  })

  it('should display error class when error is provided', () => {
    render(<Input error="字段不能为空" />)
    const input = screen.getByRole('textbox')
    expect(input.className).toContain('border-danger')
  })

  it('should render icon when provided', () => {
    render(<Input icon={<span data-testid="icon">🔍</span>} />)
    expect(screen.getByTestId('icon')).toBeInTheDocument()
  })

  it('should not render icon when not provided', () => {
    const { container } = render(<Input />)
    expect(container.querySelector('[data-testid="icon"]')).not.toBeInTheDocument()
  })

  it('should render suffix when provided', () => {
    render(<Input suffix={<span data-testid="suffix">OK</span>} />)
    expect(screen.getByTestId('suffix')).toBeInTheDocument()
  })
})

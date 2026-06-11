import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { ErrorMessage } from '../../src/components/base/ErrorMessage'

describe('ErrorMessage', () => {
  it('should render children', () => {
    render(<ErrorMessage>出错了</ErrorMessage>)
    expect(screen.getByText('出错了')).toBeInTheDocument()
  })

  it('should default to inline variant', () => {
    render(<ErrorMessage>错误</ErrorMessage>)
    const el = screen.getByText('错误')
    expect(el.tagName).toBe('P')
  })

  it('should render as banner when variant is banner', () => {
    render(<ErrorMessage variant="banner">网络错误</ErrorMessage>)
    const el = screen.getByText('网络错误')
    expect(el.tagName).toBe('P')
    expect(el.className).toContain('bg-danger-soft')
  })
})

import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { Badge } from '../../src/components/base/Badge'

describe('Badge', () => {
  it('should render children', () => {
    render(<Badge>标签</Badge>)
    expect(screen.getByText('标签')).toBeInTheDocument()
  })

  it('should default to primary variant', () => {
    render(<Badge>标签</Badge>)
    const span = screen.getByText('标签')
    expect(span.className).toContain('bg-primary-soft')
  })

  it('should apply success variant', () => {
    render(<Badge variant="success">成功</Badge>)
    const span = screen.getByText('成功')
    expect(span.className).toContain('bg-success-soft')
  })

  it('should apply danger variant', () => {
    render(<Badge variant="danger">错误</Badge>)
    const span = screen.getByText('错误')
    expect(span.className).toContain('bg-danger-soft')
  })

  it('should merge custom className', () => {
    render(<Badge className="custom">标签</Badge>)
    const span = screen.getByText('标签')
    expect(span.className).toContain('custom')
  })

  it('should render as span element', () => {
    render(<Badge>标签</Badge>)
    expect(screen.getByText('标签').tagName).toBe('SPAN')
  })
})

import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { Button } from '../../src/components/base/Button'

describe('Button', () => {
  it('should render children text', () => {
    render(<Button>提交</Button>)
    expect(screen.getByText('提交')).toBeInTheDocument()
  })

  it('should call onClick when clicked', () => {
    const onClick = vi.fn()
    render(<Button onClick={onClick}>点击</Button>)
    fireEvent.click(screen.getByText('点击'))
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('should be disabled when disabled prop is true', () => {
    render(<Button disabled>禁用</Button>)
    expect(screen.getByText('禁用')).toBeDisabled()
  })

  it('should not call onClick when disabled', () => {
    const onClick = vi.fn()
    render(<Button disabled onClick={onClick}>禁用</Button>)
    fireEvent.click(screen.getByText('禁用'))
    expect(onClick).not.toHaveBeenCalled()
  })

  it('should show loading spinner when loading', () => {
    render(<Button loading>加载中</Button>)
    expect(screen.queryByText('加载中')).not.toBeInTheDocument()
    expect(document.querySelector('.animate-spin')).toBeInTheDocument()
  })

  it('should be disabled when loading', () => {
    render(<Button loading>加载中</Button>)
    const btn = screen.getByRole('button')
    expect(btn).toBeDisabled()
  })

  it('should default to primary variant', () => {
    render(<Button>按钮</Button>)
    const btn = screen.getByText('按钮').closest('button')!
    expect(btn.className).toContain('bg-primary')
  })

  it('should apply secondary variant', () => {
    render(<Button variant="secondary">按钮</Button>)
    const btn = screen.getByText('按钮').closest('button')!
    expect(btn.className).toContain('bg-surface')
    expect(btn.className).toContain('border-border-strong')
  })

  it('should apply danger variant', () => {
    render(<Button variant="danger">删除</Button>)
    const btn = screen.getByText('删除').closest('button')!
    expect(btn.className).toContain('bg-danger')
  })

  it('should apply tertiary variant', () => {
    render(<Button variant="tertiary">操作</Button>)
    const btn = screen.getByText('操作').closest('button')!
    expect(btn.className).toContain('text-text-muted')
  })

  it('should forward ref', () => {
    const ref = { current: null }
    render(<Button ref={ref}>按钮</Button>)
    expect(ref.current).toBeInstanceOf(HTMLButtonElement)
  })

  it('should merge custom className', () => {
    render(<Button className="custom">按钮</Button>)
    const btn = screen.getByText('按钮').closest('button')!
    expect(btn.className).toContain('custom')
  })
})

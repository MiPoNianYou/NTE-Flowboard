import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { StatusMessage } from '../../src/components/base/StatusMessage'

describe('StatusMessage', () => {
  it('should render children in inline mode', () => {
    render(<StatusMessage tone="danger" mode="inline">错误信息</StatusMessage>)
    expect(screen.getByText('错误信息')).toBeInTheDocument()
  })

  it('should render as p element in inline mode', () => {
    render(<StatusMessage tone="danger" mode="inline">错误</StatusMessage>)
    expect(screen.getByText('错误').tagName).toBe('P')
  })

  it('should render as p element in banner mode', () => {
    render(<StatusMessage tone="success" mode="banner">成功</StatusMessage>)
    expect(screen.getByText('成功').tagName).toBe('P')
  })

  it('should render as div in callout mode', () => {
    render(<StatusMessage tone="info" mode="callout">提示信息</StatusMessage>)
    expect(screen.getByText('提示信息').closest('div')).toBeInTheDocument()
  })

  it('should render icon in callout mode when provided', () => {
    render(
      <StatusMessage tone="warning" mode="callout" icon={<span data-testid="icon">⚠</span>}>
        警告
      </StatusMessage>,
    )
    expect(screen.getByTestId('icon')).toBeInTheDocument()
  })

  it('should not render icon in inline mode', () => {
    render(
      <StatusMessage tone="danger" mode="inline" icon={<span data-testid="icon">⚠</span>}>
        错误
      </StatusMessage>,
    )
    expect(screen.queryByTestId('icon')).not.toBeInTheDocument()
  })

  it('should default to danger tone and inline mode', () => {
    render(<StatusMessage>消息</StatusMessage>)
    const el = screen.getByText('消息')
    expect(el.className).toContain('text-danger')
  })

  it('should merge custom className', () => {
    render(<StatusMessage className="custom">消息</StatusMessage>)
    expect(screen.getByText('消息').className).toContain('custom')
  })
})

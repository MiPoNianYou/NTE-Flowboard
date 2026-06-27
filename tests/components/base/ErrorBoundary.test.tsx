import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { ErrorBoundary } from '../../../src/components/base/ErrorBoundary'

vi.mock('../../../src/assets/nanally-error.webp', () => ({ default: 'mocked-image.webp' }))

function ThrowingComponent({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) throw new Error('测试错误')
  return <div>正常内容</div>
}

describe('ErrorBoundary', () => {
  it('should render children when no error', () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={false} />
      </ErrorBoundary>,
    )
    expect(screen.getByText('正常内容')).toBeInTheDocument()
  })

  it('should render error UI when child throws', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    render(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>,
    )
    expect(screen.getByText('出现了一些问题')).toBeInTheDocument()
    expect(screen.getByText('测试错误')).toBeInTheDocument()
    consoleSpy.mockRestore()
  })

  it('should render reload button', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    render(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>,
    )
    expect(screen.getByText('刷新页面')).toBeInTheDocument()
    consoleSpy.mockRestore()
  })

  it('should show unknown error message when error has no message', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    function NoMessageError() {
      throw { name: 'CustomError' }
      return null
    }
    render(
      <ErrorBoundary>
        <NoMessageError />
      </ErrorBoundary>,
    )
    expect(screen.getByText('未知错误')).toBeInTheDocument()
    consoleSpy.mockRestore()
  })
})

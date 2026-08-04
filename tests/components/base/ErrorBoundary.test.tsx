import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ErrorBoundary } from '../../../src/components/base/ErrorBoundary'

function ThrowingChild(): never {
  throw new Error('Test crash')
}

describe('ErrorBoundary', () => {
  it('replaces crashed content with a useful recovery screen', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

    render(
      <ErrorBoundary>
        <ThrowingChild />
      </ErrorBoundary>,
    )

    expect(screen.getByRole('heading', { name: '页面出错了' })).toBeInTheDocument()
    expect(screen.getByText('Test crash')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '刷新页面' })).toBeInTheDocument()
    expect(consoleError).toHaveBeenCalled()
  })
})

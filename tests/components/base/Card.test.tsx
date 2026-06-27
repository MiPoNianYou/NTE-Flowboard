import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { Card } from '../../../src/components/base/Card'

describe('Card', () => {
  it('should render children', () => {
    render(<Card>内容</Card>)
    expect(screen.getByText('内容')).toBeInTheDocument()
  })

  it('should apply surface variant by default', () => {
    const { container } = render(<Card>内容</Card>)
    const div = container.firstChild as HTMLElement
    expect(div.className).toContain('bg-surface')
  })

  it('should apply elevated variant', () => {
    const { container } = render(<Card variant="elevated">内容</Card>)
    const div = container.firstChild as HTMLElement
    expect(div.className).toContain('bg-elevated')
  })

  it('should forward ref', () => {
    const ref = { current: null }
    render(<Card ref={ref}>内容</Card>)
    expect(ref.current).toBeInstanceOf(HTMLDivElement)
  })

  it('should merge custom className', () => {
    const { container } = render(<Card className="custom-class">内容</Card>)
    const div = container.firstChild as HTMLElement
    expect(div.className).toContain('custom-class')
  })

  it('should pass through HTML attributes', () => {
    render(<Card data-testid="card" role="dialog">内容</Card>)
    expect(screen.getByTestId('card')).toHaveAttribute('role', 'dialog')
  })
})

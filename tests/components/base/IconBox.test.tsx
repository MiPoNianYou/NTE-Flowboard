import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { IconBox } from '../../../src/components/base/IconBox'

describe('IconBox', () => {
  it('should render icon', () => {
    render(<IconBox icon={<span data-testid="icon">★</span>} />)
    expect(screen.getByTestId('icon')).toBeInTheDocument()
  })

  it('should apply md size by default', () => {
    const { container } = render(<IconBox icon={<span>★</span>} />)
    const div = container.firstChild as HTMLElement
    expect(div.className).toContain('size-8')
  })

  it('should apply lg size', () => {
    const { container } = render(<IconBox icon={<span>★</span>} size="lg" />)
    const div = container.firstChild as HTMLElement
    expect(div.className).toContain('size-10')
  })

  it('should apply primary variant', () => {
    const { container } = render(<IconBox icon={<span>★</span>} variant="primary" />)
    const div = container.firstChild as HTMLElement
    expect(div.className).toContain('bg-primary/15')
  })

  it('should apply circle shape', () => {
    const { container } = render(<IconBox icon={<span>★</span>} shape="circle" />)
    const div = container.firstChild as HTMLElement
    expect(div.className).toContain('rounded-full')
  })

  it('should apply rounded shape by default', () => {
    const { container } = render(<IconBox icon={<span>★</span>} />)
    const div = container.firstChild as HTMLElement
    expect(div.className).toContain('rounded-xl')
  })

  it('should merge custom className', () => {
    const { container } = render(<IconBox icon={<span>★</span>} className="custom" />)
    const div = container.firstChild as HTMLElement
    expect(div.className).toContain('custom')
  })
})

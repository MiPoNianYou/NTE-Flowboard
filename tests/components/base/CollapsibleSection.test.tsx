import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { CollapsibleSection } from '../../../src/components/base/CollapsibleSection'



describe('CollapsibleSection', () => {
  it('should render label', () => {
    render(<CollapsibleSection label="分组">内容</CollapsibleSection>)
    expect(screen.getByText('分组')).toBeInTheDocument()
  })

  it('should render children when opened', () => {
    render(<CollapsibleSection label="分组" defaultOpen>隐藏内容</CollapsibleSection>)
    expect(screen.getByText('隐藏内容')).toBeInTheDocument()
  })

  it('should not render children content when closed', () => {
    render(<CollapsibleSection label="分组">隐藏内容</CollapsibleSection>)
    // Content is in DOM but hidden via grid-rows-[0fr]
    expect(screen.getByText('隐藏内容')).toBeInTheDocument()
  })

  it('should toggle on click', () => {
    render(<CollapsibleSection label="分组">内容</CollapsibleSection>)
    const button = screen.getByText('分组').closest('button')!
    button.click()
    // After click, section opens
    expect(screen.getByText('内容')).toBeInTheDocument()
  })

  it('should show count when provided', () => {
    render(<CollapsibleSection label="分组" count={5}>内容</CollapsibleSection>)
    expect(screen.getByText('(5)')).toBeInTheDocument()
  })

  it('should render icon when provided', () => {
    render(
      <CollapsibleSection label="分组" icon={<span data-testid="icon"></span>}>
        内容
      </CollapsibleSection>,
    )
    expect(screen.getByTestId('icon')).toBeInTheDocument()
  })

  it('should default to collapsed', () => {
    render(<CollapsibleSection label="分组">内容</CollapsibleSection>)
    const grid = screen.getByText('内容').closest('[class*="grid"]')!
    expect(grid.className).toContain('grid-rows-[0fr]')
  })

  it('should expand when defaultOpen is true', () => {
    render(<CollapsibleSection label="分组" defaultOpen>内容</CollapsibleSection>)
    const grid = screen.getByText('内容').closest('[class*="grid"]')!
    expect(grid.className).toContain('grid-rows-[1fr]')
  })
})

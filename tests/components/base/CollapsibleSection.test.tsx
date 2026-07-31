import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { CollapsibleSection } from '../../../src/components/base/CollapsibleSection'

describe('CollapsibleSection', () => {
  it('connects the disclosure button to inert collapsed content', () => {
    render(
      <CollapsibleSection label="隐藏任务">
        <button type="button">恢复任务</button>
      </CollapsibleSection>,
    )

    const toggle = screen.getByRole('button', { name: '隐藏任务' })
    const contentId = toggle.getAttribute('aria-controls')
    const content = document.getElementById(contentId!)

    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(contentId).toBeTruthy()
    expect(content).toHaveAttribute('aria-hidden', 'true')
    expect(content).toHaveAttribute('inert')
    expect(toggle.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')

    fireEvent.click(toggle)

    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(content).toHaveAttribute('aria-hidden', 'false')
    expect(content).not.toHaveAttribute('inert')
    expect(screen.getByRole('button', { name: '恢复任务' })).toBeInTheDocument()
  })

  it('reports controlled state and delegates toggling', () => {
    const onToggle = vi.fn()
    render(
      <CollapsibleSection label="隐藏任务" isOpen onToggle={onToggle}>
        <span>内容</span>
      </CollapsibleSection>,
    )

    const toggle = screen.getByRole('button', { name: '隐藏任务' })
    const content = document.getElementById(toggle.getAttribute('aria-controls')!)

    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(content).toHaveAttribute('aria-hidden', 'false')

    fireEvent.click(toggle)

    expect(onToggle).toHaveBeenCalledOnce()
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
  })
})

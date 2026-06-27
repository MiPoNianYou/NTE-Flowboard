import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { HiddenSection } from '../../src/components/HiddenSection'
import type { ChecklistItem } from '../../src/types'



vi.mock('lucide-react', () => ({
  Eye: (_props: Record<string, unknown>) => <svg data-testid="eye-icon" />,
  Trash2: (_props: Record<string, unknown>) => <svg data-testid="trash-icon" />,
  ChevronDown: (_props: Record<string, unknown>) => <svg />,
  ChevronUp: (_props: Record<string, unknown>) => <svg />,
  X: (_props: Record<string, unknown>) => <svg data-testid="x-icon" />,
}))

const mockHiddenItems: ChecklistItem[] = [
  { id: 'h1', text: '被隐藏的清单1', isCompleted: false, isHidden: true, order: 1, tags: ['标签A'] },
  { id: 'h2', text: '被隐藏的清单2', isCompleted: false, isHidden: true, order: 2, tags: [] },
]

describe('HiddenSection', () => {
  it('should render section label with count', () => {
    render(
      <HiddenSection hiddenItems={mockHiddenItems} activeTab="daily" direction="down" onShowItem={vi.fn()} onDelete={vi.fn()} shouldConfirmDelete={false} isOpen={false} onToggle={vi.fn()} />,
    )
    expect(screen.getByText(/隐藏任务/)).toBeInTheDocument()
  })

  it('should render hidden item texts', () => {
    render(
      <HiddenSection hiddenItems={mockHiddenItems} activeTab="daily" direction="down" onShowItem={vi.fn()} onDelete={vi.fn()} shouldConfirmDelete={false} isOpen={true} onToggle={vi.fn()} />,
    )
    expect(screen.getByText('被隐藏的清单1')).toBeInTheDocument()
    expect(screen.getByText('被隐藏的清单2')).toBeInTheDocument()
  })

  it('should call onShowItem when eye button clicked', () => {
    const onShowItem = vi.fn()
    render(
      <HiddenSection hiddenItems={mockHiddenItems} activeTab="daily" direction="down" onShowItem={onShowItem} onDelete={vi.fn()} shouldConfirmDelete={false} isOpen={true} onToggle={vi.fn()} />,
    )
    const eyeButtons = screen.getAllByTestId('eye-icon')
    fireEvent.click(eyeButtons[0].closest('button')!)
    expect(onShowItem).toHaveBeenCalledWith('daily', 'h1')
  })

  it('should render tags for items with tags', () => {
    render(
      <HiddenSection hiddenItems={mockHiddenItems} activeTab="daily" direction="down" onShowItem={vi.fn()} onDelete={vi.fn()} shouldConfirmDelete={false} isOpen={true} onToggle={vi.fn()} />,
    )
    expect(screen.getByText('标签A')).toBeInTheDocument()
  })

  it('should show delete button for each item', () => {
    render(
      <HiddenSection hiddenItems={mockHiddenItems} activeTab="daily" direction="down" onShowItem={vi.fn()} onDelete={vi.fn()} shouldConfirmDelete={false} isOpen={true} onToggle={vi.fn()} />,
    )
    const trashButtons = screen.getAllByTestId('trash-icon')
    expect(trashButtons.length).toBe(2)
  })
})

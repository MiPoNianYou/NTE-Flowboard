import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { HiddenSection } from '../../src/components/HiddenSection'
import type { ChecklistItem } from '../../src/types'

vi.mock('motion/react')

vi.mock('lucide-react', () => ({
  Eye: (props: Record<string, unknown>) => <svg data-testid="eye-icon" />,
  Trash2: (props: Record<string, unknown>) => <svg data-testid="trash-icon" />,
  ChevronDown: (props: Record<string, unknown>) => <svg />,
  ChevronUp: (props: Record<string, unknown>) => <svg />,
  X: (props: Record<string, unknown>) => <svg data-testid="x-icon" />,
}))

const hiddenItems: ChecklistItem[] = [
  { text: '隐藏任务1', completed: false, hidden: true, order: 1, tags: ['标签A'] },
  { text: '隐藏任务2', completed: false, hidden: true, order: 2, tags: [] },
]

describe('HiddenSection', () => {
  it('should render nothing when no hidden items', () => {
    const { container } = render(
      <HiddenSection hiddenItems={[]} activeTab="daily" onShowItem={vi.fn()} onDelete={vi.fn()} confirmDelete={false} />,
    )
    expect(container.innerHTML).toBe('')
  })

  it('should render section label with count', () => {
    render(
      <HiddenSection hiddenItems={hiddenItems} activeTab="daily" onShowItem={vi.fn()} onDelete={vi.fn()} confirmDelete={false} />,
    )
    expect(screen.getByText(/隐藏事项/)).toBeInTheDocument()
  })

  it('should render hidden item texts', () => {
    render(
      <HiddenSection hiddenItems={hiddenItems} activeTab="daily" onShowItem={vi.fn()} onDelete={vi.fn()} confirmDelete={false} />,
    )
    expect(screen.getByText('隐藏任务1')).toBeInTheDocument()
    expect(screen.getByText('隐藏任务2')).toBeInTheDocument()
  })

  it('should call onShowItem when eye button clicked', () => {
    const onShowItem = vi.fn()
    render(
      <HiddenSection hiddenItems={hiddenItems} activeTab="daily" onShowItem={onShowItem} onDelete={vi.fn()} confirmDelete={false} />,
    )
    const eyeButtons = screen.getAllByTestId('eye-icon')
    fireEvent.click(eyeButtons[0].closest('button')!)
    expect(onShowItem).toHaveBeenCalledWith('daily', 1)
  })

  it('should render tags for items with tags', () => {
    render(
      <HiddenSection hiddenItems={hiddenItems} activeTab="daily" onShowItem={vi.fn()} onDelete={vi.fn()} confirmDelete={false} />,
    )
    expect(screen.getByText('标签A')).toBeInTheDocument()
  })

  it('should show delete button for each item', () => {
    render(
      <HiddenSection hiddenItems={hiddenItems} activeTab="daily" onShowItem={vi.fn()} onDelete={vi.fn()} confirmDelete={false} />,
    )
    const trashButtons = screen.getAllByTestId('trash-icon')
    expect(trashButtons.length).toBe(2)
  })
})

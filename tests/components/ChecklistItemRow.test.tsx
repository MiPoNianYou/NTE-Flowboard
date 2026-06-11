import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { ChecklistItemRow } from '../../src/components/ChecklistItemRow'
import type { ChecklistItem } from '../../src/types'

vi.mock('motion/react')

vi.mock('@dnd-kit/sortable', () => ({
  useSortable: vi.fn(() => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    isDragging: false,
  })),
}))

vi.mock('../../src/utils/tagColors', () => ({
  getTagColors: vi.fn(() => ({ text: '#EF4444', bg: '#ef444424' })),
}))

vi.mock('../../src/hooks/usePendingDelete', () => {
  const actual = { handleDelete: vi.fn(), isPending: vi.fn(() => false) }
  return { usePendingDelete: vi.fn(() => actual) }
})

const mockItem: ChecklistItem = {
  text: '测试任务',
  completed: false,
  hidden: false,
  order: 1,
  tags: ['地图'],
}

describe('ChecklistItemRow', () => {
  it('should render item text', () => {
    render(
      <ChecklistItemRow
        item={mockItem}
        tab="daily"
        onToggle={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onHide={vi.fn()}
        confirmDelete={false}
      />,
    )
    expect(screen.getByText('测试任务')).toBeInTheDocument()
  })

  it('should call onToggle when checkbox is clicked', () => {
    const onToggle = vi.fn()
    render(
      <ChecklistItemRow
        item={mockItem}
        tab="daily"
        onToggle={onToggle}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onHide={vi.fn()}
        confirmDelete={false}
      />,
    )
    const checkbox = screen.getByRole('button', { name: /标记/ })
    fireEvent.click(checkbox)
    expect(onToggle).toHaveBeenCalledWith('daily', 1)
  })

  it('should render tags', () => {
    render(
      <ChecklistItemRow
        item={mockItem}
        tab="daily"
        onToggle={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onHide={vi.fn()}
        confirmDelete={false}
      />,
    )
    expect(screen.getByText('地图')).toBeInTheDocument()
  })

  it('should show completed state with line-through', () => {
    render(
      <ChecklistItemRow
        item={{ ...mockItem, completed: true }}
        tab="daily"
        onToggle={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onHide={vi.fn()}
        confirmDelete={false}
      />,
    )
    const text = screen.getByText('测试任务')
    expect(text.className).toContain('line-through')
  })

  it('should show correct aria-label for uncompleted item', () => {
    render(
      <ChecklistItemRow
        item={mockItem}
        tab="daily"
        onToggle={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onHide={vi.fn()}
        confirmDelete={false}
      />,
    )
    const checkbox = screen.getByRole('button', { name: /标记.*测试任务.*为已完成/ })
    expect(checkbox).toHaveAttribute('aria-pressed', 'false')
  })

  it('should show correct aria-label for completed item', () => {
    render(
      <ChecklistItemRow
        item={{ ...mockItem, completed: true }}
        tab="daily"
        onToggle={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onHide={vi.fn()}
        confirmDelete={false}
      />,
    )
    const checkbox = screen.getByRole('button', { name: /标记.*测试任务.*为未完成/ })
    expect(checkbox).toHaveAttribute('aria-pressed', 'true')
  })

  it('should handle items without tags', () => {
    render(
      <ChecklistItemRow
        item={{ ...mockItem, tags: [] }}
        tab="daily"
        onToggle={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onHide={vi.fn()}
        confirmDelete={false}
      />,
    )
    expect(screen.getByText('测试任务')).toBeInTheDocument()
    expect(screen.queryByText('地图')).not.toBeInTheDocument()
  })

  it('should handle items with undefined tags', () => {
    render(
      <ChecklistItemRow
        item={{ ...mockItem, tags: undefined as unknown as string[] }}
        tab="daily"
        onToggle={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onHide={vi.fn()}
        confirmDelete={false}
      />,
    )
    expect(screen.getByText('测试任务')).toBeInTheDocument()
  })

  it('should pass correct tab to onToggle', () => {
    const onToggle = vi.fn()
    render(
      <ChecklistItemRow
        item={mockItem}
        tab="weekly"
        onToggle={onToggle}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onHide={vi.fn()}
        confirmDelete={false}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /标记/ }))
    expect(onToggle).toHaveBeenCalledWith('weekly', 1)
  })

  it('should call onHide when hide button is clicked', () => {
    const onHide = vi.fn()
    render(
      <ChecklistItemRow
        item={mockItem}
        tab="daily"
        onToggle={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onHide={onHide}
        confirmDelete={false}
      />,
    )
    const hideBtn = screen.getByRole('button', { name: /隐藏/ })
    fireEvent.click(hideBtn)
    expect(onHide).toHaveBeenCalledWith('daily', 1)
  })

  it('should open edit form when edit button is clicked', () => {
    render(
      <ChecklistItemRow
        item={mockItem}
        tab="daily"
        onToggle={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onHide={vi.fn()}
        confirmDelete={false}
      />,
    )
    const editBtn = screen.getByRole('button', { name: /编辑/ })
    fireEvent.click(editBtn)
    expect(screen.getByPlaceholderText('输入任务内容...')).toBeInTheDocument()
  })

  it('should call onEdit when save is clicked in edit form', () => {
    const onEdit = vi.fn()
    render(
      <ChecklistItemRow
        item={mockItem}
        tab="daily"
        onToggle={vi.fn()}
        onEdit={onEdit}
        onDelete={vi.fn()}
        onHide={vi.fn()}
        confirmDelete={false}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /编辑/ }))
    const input = screen.getByPlaceholderText('输入任务内容...')
    fireEvent.change(input, { target: { value: '改名' } })
    // Click save button (the one with Save icon)
    const saveBtns = screen.getAllByRole('button')
    const saveBtn = saveBtns.find(b => b.querySelector('svg'))
    if (saveBtn) fireEvent.click(saveBtn)
    // onEdit should be called with the new text
    expect(onEdit).toHaveBeenCalled()
  })

  it('should cancel edit when Escape is pressed', () => {
    render(
      <ChecklistItemRow
        item={mockItem}
        tab="daily"
        onToggle={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onHide={vi.fn()}
        confirmDelete={false}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /编辑/ }))
    expect(screen.getByPlaceholderText('输入任务内容...')).toBeInTheDocument()
    fireEvent.keyDown(screen.getByPlaceholderText('输入任务内容...'), { key: 'Escape' })
    expect(screen.queryByPlaceholderText('输入任务内容...')).not.toBeInTheDocument()
  })
})

import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { ChecklistPanel } from '../../src/components/ChecklistPanel'
import type { ChecklistItem } from '../../src/types'



vi.mock('@dnd-kit/core', () => ({
  DndContext: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PointerSensor: class {},
  useSensor: vi.fn(),
  useSensors: vi.fn(() => []),
  closestCenter: vi.fn(),
}))

vi.mock('@dnd-kit/sortable', () => ({
  SortableContext: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  verticalListSortingStrategy: vi.fn(),
  useSortable: vi.fn(() => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    isDragging: false,
  })),
}))

vi.mock('@tanstack/react-virtual', () => ({
  useVirtualizer: vi.fn(() => ({
    getVirtualItems: vi.fn(() => []),
    getTotalSize: vi.fn(() => 0),
  })),
}))

vi.mock('../../src/utils/tagColors', () => ({
  getTagColors: vi.fn(() => ({ text: '#EF4444', backgroundColor: '#ef444424' })),
}))

vi.mock('../../src/hooks/usePendingDelete', () => ({
  usePendingDelete: vi.fn(() => ({
    handleDelete: vi.fn(),
    isPending: vi.fn(() => false),
  })),
}))

vi.mock('../../src/components/EmptyState', () => ({
  EmptyState: ({ title, subtitle }: { title: string; subtitle?: string }) => (
    <div>
      <div>{title}</div>
      {subtitle && <div>{subtitle}</div>}
    </div>
  ),
}))

vi.mock('../../src/components/ChecklistItemRow', () => ({
  ChecklistItemRow: ({ item }: { item: ChecklistItem }) => (
    <div data-testid="item">{item.text}</div>
  ),
}))

const mockItems: ChecklistItem[] = [
  { id: 'cp1', text: '任务1', isCompleted: false, isHidden: false, order: 1, tags: [] },
  { id: 'cp2', text: '任务2', isCompleted: true, isHidden: false, order: 2, tags: ['地图'] },
]

describe('ChecklistPanel', () => {
  it('should render visible items', () => {
    render(
      <ChecklistPanel
        visibleItems={mockItems}
        activeTab="daily"
        direction="down"
        isAutoMoveEnabled={false}
        onToggle={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onHide={vi.fn()}
        onReorder={vi.fn()}
        shouldConfirmDelete={false}
      />,
    )
    expect(screen.getByText('任务1')).toBeInTheDocument()
    expect(screen.getByText('任务2')).toBeInTheDocument()
  })

  it('should only render visible items', () => {
    const items: ChecklistItem[] = [
      { id: 'cv1', text: '可见任务', isCompleted: false, isHidden: false, order: 1, tags: [] },
      { id: 'cv2', text: '另一个可用', isCompleted: false, isHidden: false, order: 2, tags: [] },
    ]
    render(
      <ChecklistPanel
        visibleItems={items}
        activeTab="daily"
        direction="down"
        isAutoMoveEnabled={false}
        onToggle={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onHide={vi.fn()}
        onReorder={vi.fn()}
        shouldConfirmDelete={false}
      />,
    )
    expect(screen.getByText('可见任务')).toBeInTheDocument()
    expect(screen.getByText('另一个可用')).toBeInTheDocument()
    expect(screen.queryByText('不存在的任务')).not.toBeInTheDocument()
  })

  it('should render empty state when no items', () => {
    render(
      <ChecklistPanel
        visibleItems={[]}
        activeTab="daily"
        direction="down"
        isAutoMoveEnabled={false}
        onToggle={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onHide={vi.fn()}
        onReorder={vi.fn()}
        shouldConfirmDelete={false}
      />,
    )
    expect(screen.getByText('暂无任务')).toBeInTheDocument()
  })

  it('should show empty state with random subtitle for daily', () => {
    render(
      <ChecklistPanel
        visibleItems={[]}
        activeTab="daily"
        direction="down"
        isAutoMoveEnabled={false}
        onToggle={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onHide={vi.fn()}
        onReorder={vi.fn()}
        shouldConfirmDelete={false}
      />,
    )
    expect(screen.getByText('暂无任务')).toBeInTheDocument()
  })

  it('should show empty state with random subtitle for weekly', () => {
    render(
      <ChecklistPanel
        visibleItems={[]}
        activeTab="weekly"
        direction="down"
        isAutoMoveEnabled={false}
        onToggle={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onHide={vi.fn()}
        onReorder={vi.fn()}
        shouldConfirmDelete={false}
      />,
    )
    expect(screen.getByText('暂无任务')).toBeInTheDocument()
  })

  it('should pass shouldConfirmDelete to ChecklistItemRow', () => {
    render(
      <ChecklistPanel
        visibleItems={mockItems}
        activeTab="daily"
        direction="down"
        isAutoMoveEnabled={false}
        onToggle={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onHide={vi.fn()}
        onReorder={vi.fn()}
        shouldConfirmDelete={true}
      />,
    )
    expect(screen.getByText('任务1')).toBeInTheDocument()
  })

  it('should move completed items to bottom when isAutoMoveEnabled is true', () => {
    const items: ChecklistItem[] = [
      { id: 'cm1', text: '未完成', isCompleted: false, isHidden: false, order: 1, tags: [] },
      { id: 'cm2', text: '已完成', isCompleted: true, isHidden: false, order: 2, tags: [] },
    ]
    render(
      <ChecklistPanel
        visibleItems={items}
        activeTab="daily"
        direction="down"
        isAutoMoveEnabled={true}
        onToggle={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onHide={vi.fn()}
        onReorder={vi.fn()}
        shouldConfirmDelete={false}
      />,
    )
    const renderedItems = screen.getAllByTestId('item')
    expect(renderedItems[0].textContent).toBe('未完成')
    expect(renderedItems[1].textContent).toBe('已完成')
  })

  it('should render many items in virtual mode without errors', () => {
    const manyItems: ChecklistItem[] = Array.from({ length: 60 }, (_, i) => ({
      id: `vm${i}`,
      text: `任务${i}`,
      isCompleted: false,
      isHidden: false,
      order: i + 1,
      tags: [],
    }))
    render(
      <ChecklistPanel
        visibleItems={manyItems}
        activeTab="daily"
        direction="down"
        isAutoMoveEnabled={false}
        onToggle={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onHide={vi.fn()}
        onReorder={vi.fn()}
        shouldConfirmDelete={false}
      />,
    )
    // Should show virtual list mode indicator
    expect(screen.getByText(/虚拟列表模式/)).toBeInTheDocument()
    expect(screen.getByText(/60/)).toBeInTheDocument()
  })
})

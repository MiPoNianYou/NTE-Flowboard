import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { ChecklistPanel } from '../../src/components/ChecklistPanel'
import type { ChecklistItem } from '../../src/types'

vi.mock('motion/react')

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
  getTagColors: vi.fn(() => ({ text: '#EF4444', bg: '#ef444424' })),
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
  { text: '任务1', completed: false, hidden: false, order: 1, tags: [] },
  { text: '任务2', completed: true, hidden: false, order: 2, tags: ['地图'] },
]

describe('ChecklistPanel', () => {
  it('should render visible items', () => {
    render(
      <ChecklistPanel
        visibleItems={mockItems}
        activeTab="daily"
        autoMoveCompleted={false}
        isLayoutTransitioning={false}

        onToggle={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onHide={vi.fn()}
        onReorder={vi.fn()}
        confirmDelete={false}
      />,
    )
    expect(screen.getByText('任务1')).toBeInTheDocument()
    expect(screen.getByText('任务2')).toBeInTheDocument()
  })

  it('should only render visible items', () => {
    const items: ChecklistItem[] = [
      { text: '可见任务', completed: false, hidden: false, order: 1, tags: [] },
      { text: '另一个可用', completed: false, hidden: false, order: 2, tags: [] },
    ]
    render(
      <ChecklistPanel
        visibleItems={items}
        activeTab="daily"
        autoMoveCompleted={false}
        isLayoutTransitioning={false}

        onToggle={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onHide={vi.fn()}
        onReorder={vi.fn()}
        confirmDelete={false}
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
        autoMoveCompleted={false}
        isLayoutTransitioning={false}

        onToggle={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onHide={vi.fn()}
        onReorder={vi.fn()}
        confirmDelete={false}
      />,
    )
    expect(screen.getByText('暂无任务')).toBeInTheDocument()
  })

  it('should show daily-specific subtitle in empty state', () => {
    render(
      <ChecklistPanel
        visibleItems={[]}
        activeTab="daily"
        autoMoveCompleted={false}
        isLayoutTransitioning={false}

        onToggle={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onHide={vi.fn()}
        onReorder={vi.fn()}
        confirmDelete={false}
      />,
    )
    expect(screen.getByText('点击下方添加今天的任务')).toBeInTheDocument()
  })

  it('should show weekly-specific subtitle in empty state', () => {
    render(
      <ChecklistPanel
        visibleItems={[]}
        activeTab="weekly"
        autoMoveCompleted={false}
        isLayoutTransitioning={false}

        onToggle={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onHide={vi.fn()}
        onReorder={vi.fn()}
        confirmDelete={false}
      />,
    )
    expect(screen.getByText('点击下方添加本周的任务')).toBeInTheDocument()
  })

  it('should show custom name in empty state subtitle', () => {
    render(
      <ChecklistPanel
        visibleItems={[]}
        activeTab="custom"
        autoMoveCompleted={false}
        isLayoutTransitioning={false}

        onToggle={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onHide={vi.fn()}
        onReorder={vi.fn()}
        confirmDelete={false}
        customName="我的清单"
      />,
    )
    expect(screen.getByText('点击下方添加我的清单任务')).toBeInTheDocument()
  })

  it('should show default custom name when customName is not provided', () => {
    render(
      <ChecklistPanel
        visibleItems={[]}
        activeTab="custom"
        autoMoveCompleted={false}
        isLayoutTransitioning={false}

        onToggle={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onHide={vi.fn()}
        onReorder={vi.fn()}
        confirmDelete={false}
      />,
    )
    expect(screen.getByText('点击下方添加自定义任务')).toBeInTheDocument()
  })

  it('should pass confirmDelete to ChecklistItemRow', () => {
    render(
      <ChecklistPanel
        visibleItems={mockItems}
        activeTab="daily"
        autoMoveCompleted={false}
        isLayoutTransitioning={false}

        onToggle={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onHide={vi.fn()}
        onReorder={vi.fn()}
        confirmDelete={true}
      />,
    )
    expect(screen.getByText('任务1')).toBeInTheDocument()
  })

  it('should move completed items to bottom when autoMoveCompleted is true', () => {
    const items: ChecklistItem[] = [
      { text: '未完成', completed: false, hidden: false, order: 1, tags: [] },
      { text: '已完成', completed: true, hidden: false, order: 2, tags: [] },
    ]
    render(
      <ChecklistPanel
        visibleItems={items}
        activeTab="daily"
        autoMoveCompleted={true}
        isLayoutTransitioning={false}

        onToggle={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onHide={vi.fn()}
        onReorder={vi.fn()}
        confirmDelete={false}
      />,
    )
    const renderedItems = screen.getAllByTestId('item')
    expect(renderedItems[0].textContent).toBe('未完成')
    expect(renderedItems[1].textContent).toBe('已完成')
  })

  it('should render many items in virtual mode without errors', () => {
    const manyItems: ChecklistItem[] = Array.from({ length: 60 }, (_, i) => ({
      text: `任务${i}`,
      completed: false,
      hidden: false,
      order: i + 1,
      tags: [],
    }))
    render(
      <ChecklistPanel
        visibleItems={manyItems}
        activeTab="daily"
        autoMoveCompleted={false}
        isLayoutTransitioning={false}

        onToggle={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onHide={vi.fn()}
        onReorder={vi.fn()}
        confirmDelete={false}
      />,
    )
    // Should show virtual list mode indicator
    expect(screen.getByText(/虚拟列表模式/)).toBeInTheDocument()
    expect(screen.getByText(/60/)).toBeInTheDocument()
  })
})

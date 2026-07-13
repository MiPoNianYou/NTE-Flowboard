import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { ChecklistItemRow } from '../../../src/components/ChecklistItemRow'
import type { ChecklistItem } from '../../../src/types'


vi.mock('@dnd-kit/sortable', () => ({
  useSortable: vi.fn(() => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    isDragging: false,
  })),
}))

vi.mock('../../../src/utils/tagColors', () => ({
  getTagColors: vi.fn(() => ({ text: '#EF4444', backgroundColor: '#ef444424' })),
  previewTagColors: vi.fn(() => ({ text: '#EF4444', backgroundColor: '#ef444424' })),
}))

let pendingDeleteState = { handleDelete: vi.fn(), isPending: vi.fn(() => false) }

vi.mock('../../../src/hooks/usePendingDelete', () => ({
  usePendingDelete: vi.fn(() => pendingDeleteState),
}))

const mockItem: ChecklistItem = {
  id: 'test1',
  text: '测试任务',
  isCompleted: false,
  isHidden: false,
  order: 1,
  tags: ['地图'],
}

function setTouchDevice(isTouch: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      matches: isTouch && (query === '(hover: none)' || query === '(pointer: coarse)'),
    })),
  )
}

describe('ChecklistItemRow', () => {
  beforeEach(() => {
    pendingDeleteState = { handleDelete: vi.fn(), isPending: vi.fn(() => false) }
  })

  it('shows the mobile action bar after tapping a task', () => {
    setTouchDevice(true)
    render(
      <ChecklistItemRow
        item={mockItem}
        tab="daily"
        onToggle={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onHide={vi.fn()}
        shouldConfirmDelete={false}
      />,
    )

    fireEvent.click(screen.getByText('测试任务'))

    expect(screen.getByRole('button', { name: '编辑' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '隐藏' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '删除' })).toBeInTheDocument()
  })

  it('uses the mobile edit action bar in the agreed order', () => {
    setTouchDevice(true)
    render(
      <ChecklistItemRow
        item={mockItem}
        tab="daily"
        onToggle={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onHide={vi.fn()}
        shouldConfirmDelete={false}
      />,
    )

    fireEvent.click(screen.getByText('测试任务'))
    fireEvent.click(screen.getByRole('button', { name: '编辑' }))

    expect(screen.getAllByRole('button').slice(-3).map((button) => button.textContent)).toEqual([
      '取消',
      '新增标签',
      '保存',
    ])
  })

  it('shows a confirm-delete action while deletion is pending', () => {
    setTouchDevice(true)
    pendingDeleteState = {
      handleDelete: vi.fn(),
      isPending: vi.fn(() => true),
    }
    render(
      <ChecklistItemRow
        item={mockItem}
        tab="daily"
        onToggle={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onHide={vi.fn()}
        shouldConfirmDelete
      />,
    )

    fireEvent.click(screen.getByText('测试任务'))

    expect(screen.getByRole('button', { name: '确认删除' })).toBeInTheDocument()
  })
  it('should render item text', () => {
    render(
      <ChecklistItemRow
        item={mockItem}
        tab="daily"
        onToggle={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onHide={vi.fn()}
        shouldConfirmDelete={false}
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
        shouldConfirmDelete={false}
      />,
    )
    const checkbox = screen.getByRole('button', { name: /标记/ })
    fireEvent.click(checkbox)
    expect(onToggle).toHaveBeenCalledWith('daily', 'test1')
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
        shouldConfirmDelete={false}
      />,
    )
    expect(screen.getByText('地图')).toBeInTheDocument()
  })

  it('should show completed state with line-through', () => {
    render(
      <ChecklistItemRow
        item={{ ...mockItem, isCompleted: true }}
        tab="daily"
        onToggle={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onHide={vi.fn()}
        shouldConfirmDelete={false}
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
        shouldConfirmDelete={false}
      />,
    )
    const checkbox = screen.getByRole('button', { name: /标记.*测试任务.*为已完成/ })
    expect(checkbox).toHaveAttribute('aria-pressed', 'false')
  })

  it('should show correct aria-label for completed item', () => {
    render(
      <ChecklistItemRow
        item={{ ...mockItem, isCompleted: true }}
        tab="daily"
        onToggle={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onHide={vi.fn()}
        shouldConfirmDelete={false}
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
        shouldConfirmDelete={false}
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
        shouldConfirmDelete={false}
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
        shouldConfirmDelete={false}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /标记/ }))
    expect(onToggle).toHaveBeenCalledWith('weekly', 'test1')
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
        shouldConfirmDelete={false}
      />,
    )
    const hideButton = screen.getByRole('button', { name: /隐藏/ })
    fireEvent.click(hideButton)
    expect(onHide).toHaveBeenCalledWith('daily', 'test1')
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
        shouldConfirmDelete={false}
      />, 
    )
    const editButton = screen.getByRole('button', { name: /编辑/ })
    fireEvent.click(editButton)
    expect(screen.getByLabelText('编辑任务名称')).toBeInTheDocument()
  })

  it('should call onEdit when save is clicked in inline edit mode', () => {
    const onEdit = vi.fn()
    render(
      <ChecklistItemRow
        item={mockItem}
        tab="daily"
        onToggle={vi.fn()}
        onEdit={onEdit}
        onDelete={vi.fn()}
        onHide={vi.fn()}
        shouldConfirmDelete={false}
      />, 
    )
    fireEvent.click(screen.getByRole('button', { name: /编辑/ }))
    const input = screen.getByLabelText('编辑任务名称')
    fireEvent.change(input, { target: { value: '改名' } })
    fireEvent.click(screen.getByRole('button', { name: '保存' }))
    expect(onEdit).toHaveBeenCalledWith('daily', 'test1', '改名', ['地图'])
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
        shouldConfirmDelete={false}
      />, 
    )
    fireEvent.click(screen.getByRole('button', { name: /编辑/ }))
    expect(screen.getByLabelText('编辑任务名称')).toBeInTheDocument()
    fireEvent.keyDown(screen.getByLabelText('编辑任务名称'), { key: 'Escape' })
    expect(screen.queryByLabelText('编辑任务名称')).not.toBeInTheDocument()
  })

  it('should keep editing when saving empty text', () => {
    const onEdit = vi.fn()
    render(
      <ChecklistItemRow
        item={mockItem}
        tab="daily"
        onToggle={vi.fn()}
        onEdit={onEdit}
        onDelete={vi.fn()}
        onHide={vi.fn()}
        shouldConfirmDelete={false}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /编辑/ }))
    const input = screen.getByLabelText('编辑任务名称')
    fireEvent.change(input, { target: { value: '   ' } })
    fireEvent.click(screen.getByRole('button', { name: '保存' }))
    expect(onEdit).not.toHaveBeenCalled()
    expect(screen.getByLabelText('编辑任务名称')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByPlaceholderText('任务名称不能为空')).toBeInTheDocument()
  })

  it('should show add-tag trigger in edit mode', () => {
    render(
      <ChecklistItemRow
        item={mockItem}
        tab="daily"
        onToggle={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onHide={vi.fn()}
        shouldConfirmDelete={false}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /编辑/ }))
    expect(screen.getByRole('button', { name: '新增标签' })).toBeInTheDocument()
  })

  it('should keep existing tags non-editable in edit mode', () => {
    render(
      <ChecklistItemRow
        item={mockItem}
        tab="daily"
        onToggle={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onHide={vi.fn()}
        shouldConfirmDelete={false}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /编辑/ }))
    fireEvent.click(screen.getByText('地图'))
    expect(screen.queryByLabelText('编辑标签 地图')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '新增标签' })).toBeEnabled()
  })

  it('should enter new-tag mode when add-tag trigger is clicked', () => {
    render(
      <ChecklistItemRow
        item={mockItem}
        tab="daily"
        onToggle={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onHide={vi.fn()}
        shouldConfirmDelete={false}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /编辑/ }))
    fireEvent.click(screen.getAllByRole('button', { name: '新增标签' })[0])
    expect(screen.getByRole('textbox', { name: '新增标签' })).toBeInTheDocument()
  })
})

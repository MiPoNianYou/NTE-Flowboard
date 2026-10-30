import type { ComponentProps } from 'react'
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

type ChecklistItemRowProps = ComponentProps<typeof ChecklistItemRow>

function renderRow(overrides: Partial<ChecklistItemRowProps> = {}) {
  const props: ChecklistItemRowProps = {
    item: mockItem,
    tab: 'daily',
    onToggle: vi.fn(),
    onEdit: vi.fn(),
    onDelete: vi.fn(),
    onHide: vi.fn(),
    shouldConfirmDelete: false,
    ...overrides,
  }

  return { ...render(<ChecklistItemRow {...props} />), props }
}

function setDeviceCapabilities({
  isCompact = false,
  isTouch = false,
}: {
  isCompact?: boolean
  isTouch?: boolean
}) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      matches:
        (isCompact && query === '(max-width: 1023px)') ||
        (isTouch && (query === '(hover: none)' || query === '(pointer: coarse)')),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  )
}

function setTouchDevice(isTouch: boolean) {
  setDeviceCapabilities({ isCompact: isTouch, isTouch })
}

describe('ChecklistItemRow', () => {
  beforeEach(() => {
    setDeviceCapabilities({ isCompact: false, isTouch: false })
    pendingDeleteState = { handleDelete: vi.fn(), isPending: vi.fn(() => false) }
  })

  it('keeps collapsed compact actions out of the accessibility tree', () => {
    setTouchDevice(true)
    renderRow()

    expect(screen.queryByRole('button', { name: '编辑' })).not.toBeInTheDocument()
  })

  it('exposes compact actions through a semantic disclosure button', () => {
    setTouchDevice(true)
    const { container } = renderRow()

    const disclosure = screen.getByRole('button', { name: '「测试任务」的更多操作' })
    const actionsId = disclosure.getAttribute('aria-controls')

    expect(disclosure).toHaveAttribute('aria-expanded', 'false')
    expect(actionsId).toBeTruthy()
    expect(document.getElementById(actionsId!)).toHaveAttribute('aria-hidden', 'true')
    expect(container.querySelector('button button')).not.toBeInTheDocument()

    fireEvent.click(disclosure)

    expect(disclosure).toHaveAttribute('aria-expanded', 'true')
    expect(document.getElementById(actionsId!)).toHaveAttribute('aria-hidden', 'false')
    expect(screen.getByRole('button', { name: '编辑' })).toBeInTheDocument()
  })

  it('toggles compact actions when a display tag is tapped', () => {
    setTouchDevice(true)
    renderRow()

    fireEvent.click(screen.getByText('地图'))

    expect(screen.getByRole('button', { name: '「测试任务」的更多操作' })).toHaveAttribute(
      'aria-expanded',
      'true',
    )
  })

  it('does not expand compact actions when completion or drag controls are clicked', () => {
    setTouchDevice(true)
    const onToggle = vi.fn()
    renderRow({ onToggle })

    const disclosure = screen.getByRole('button', { name: '「测试任务」的更多操作' })

    fireEvent.click(screen.getByRole('button', { name: /标记/ }))
    expect(onToggle).toHaveBeenCalledWith('daily', 'test1')
    expect(disclosure).toHaveAttribute('aria-expanded', 'false')

    fireEvent.click(screen.getByRole('button', { name: '拖拽排序' }))
    expect(disclosure).toHaveAttribute('aria-expanded', 'false')
  })

  it('does not render the compact disclosure button for desktop input', () => {
    renderRow()

    expect(screen.queryByRole('button', { name: '「测试任务」的更多操作' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '编辑' })).toBeInTheDocument()
  })

  it('shows the mobile action bar after tapping a task', () => {
    setTouchDevice(true)
    renderRow()

    fireEvent.click(screen.getByText('测试任务'))

    expect(screen.getByRole('button', { name: '编辑' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '归档' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '删除' })).toBeInTheDocument()
  })

  it('expands the action bar in a narrow desktop-input viewport', () => {
    setDeviceCapabilities({ isCompact: true, isTouch: false })
    renderRow()

    fireEvent.click(screen.getByText('测试任务'))

    expect(screen.getByRole('button', { name: '编辑' }).closest('.collapse-open')).not.toBeNull()
  })

  it('uses the mobile edit action bar in the agreed order', () => {
    setTouchDevice(true)
    renderRow()

    fireEvent.click(screen.getByText('测试任务'))
    fireEvent.click(screen.getByRole('button', { name: '编辑' }))

    expect(
      screen
        .getAllByRole('button')
        .slice(-3)
        .map((button) => button.textContent),
    ).toEqual(['取消', '新增标签', '保存'])
  })

  it('shows a confirm-delete action while deletion is pending', () => {
    setTouchDevice(true)
    pendingDeleteState = {
      handleDelete: vi.fn(),
      isPending: vi.fn(() => true),
    }
    renderRow({ shouldConfirmDelete: true })

    fireEvent.click(screen.getByText('测试任务'))

    expect(screen.getByRole('button', { name: '确认删除' })).toBeInTheDocument()
  })
  it('should render task content and toggle the current tab', () => {
    const onToggle = vi.fn()
    renderRow({ tab: 'weekly', onToggle })

    expect(screen.getByText('测试任务')).toBeInTheDocument()
    expect(screen.getByText('地图')).toBeInTheDocument()
    const toggle = screen.getByRole('button', { name: /标记.*测试任务.*为已完成/ })
    expect(toggle).toHaveAttribute('aria-pressed', 'false')

    fireEvent.click(toggle)
    expect(onToggle).toHaveBeenCalledWith('weekly', 'test1')
  })

  it('should expose completed state through the toggle', () => {
    renderRow({ item: { ...mockItem, isCompleted: true } })
    expect(screen.getByRole('button', { name: /标记.*测试任务.*为未完成/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  it('should call onHide when hide button is clicked', () => {
    const onHide = vi.fn()
    renderRow({ onHide })
    const hideButton = screen.getByRole('button', { name: /归档/ })
    fireEvent.click(hideButton)
    expect(onHide).toHaveBeenCalledWith('daily', 'test1')
  })

  it('should open edit form when edit button is clicked', () => {
    renderRow()
    const editButton = screen.getByRole('button', { name: /编辑/ })
    fireEvent.click(editButton)
    expect(screen.getByLabelText('编辑任务名称')).toBeInTheDocument()
  })

  it('should call onEdit when save is clicked in inline edit mode', () => {
    const onEdit = vi.fn()
    renderRow({ onEdit })
    fireEvent.click(screen.getByRole('button', { name: /编辑/ }))
    const input = screen.getByLabelText('编辑任务名称')
    fireEvent.change(input, { target: { value: '改名' } })
    fireEvent.click(screen.getByRole('button', { name: '保存' }))
    expect(onEdit).toHaveBeenCalledWith('daily', 'test1', '改名', ['地图'])
  })

  it('should cancel edit when Escape is pressed', () => {
    renderRow()
    fireEvent.click(screen.getByRole('button', { name: /编辑/ }))
    expect(screen.getByLabelText('编辑任务名称')).toBeInTheDocument()
    fireEvent.keyDown(screen.getByLabelText('编辑任务名称'), { key: 'Escape' })
    expect(screen.queryByLabelText('编辑任务名称')).not.toBeInTheDocument()
  })

  it('should keep editing when saving empty text', () => {
    const onEdit = vi.fn()
    renderRow({ onEdit })
    fireEvent.click(screen.getByRole('button', { name: /编辑/ }))
    const input = screen.getByLabelText('编辑任务名称')
    fireEvent.change(input, { target: { value: '   ' } })
    fireEvent.click(screen.getByRole('button', { name: '保存' }))
    expect(onEdit).not.toHaveBeenCalled()
    expect(screen.getByLabelText('编辑任务名称')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByPlaceholderText('任务名称不能为空')).toBeInTheDocument()
  })

  it('should show add-tag trigger in edit mode', () => {
    renderRow()
    fireEvent.click(screen.getByRole('button', { name: /编辑/ }))
    expect(screen.getByRole('button', { name: '新增标签' })).toBeInTheDocument()
  })

  it('should keep existing tags non-editable in edit mode', () => {
    renderRow()
    fireEvent.click(screen.getByRole('button', { name: /编辑/ }))
    fireEvent.click(screen.getByText('地图'))
    expect(screen.queryByLabelText('编辑标签 地图')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '新增标签' })).toBeEnabled()
  })

  it('should enter new-tag mode when add-tag trigger is clicked', () => {
    renderRow()
    fireEvent.click(screen.getByRole('button', { name: /编辑/ }))
    fireEvent.click(screen.getAllByRole('button', { name: '新增标签' })[0])
    expect(screen.getByRole('textbox', { name: '新增标签' })).toBeInTheDocument()
  })

  it('should not color a new tag until it is added', () => {
    renderRow()

    fireEvent.click(screen.getByRole('button', { name: /编辑/ }))
    fireEvent.click(screen.getAllByRole('button', { name: '新增标签' })[0])

    const input = screen.getByRole('textbox', { name: '新增标签' })
    expect(input.parentElement).not.toHaveAttribute(
      'style',
      expect.stringContaining('background-color'),
    )
  })
})

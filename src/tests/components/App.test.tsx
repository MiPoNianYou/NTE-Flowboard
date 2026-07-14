import { render, screen, fireEvent, act } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import App from '../../App'

vi.mock('../../utils/supabase')

vi.mock('@dnd-kit/core', () => ({
  DndContext: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DragOverlay: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
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

vi.mock('../../utils/tagColors', () => ({
  getTagColors: vi.fn(() => ({ text: '#EF4444', backgroundColor: '#ef444424' })),
  cleanupRegistry: vi.fn(),
}))

vi.mock('../../utils/colors', () => ({
  injectColorTokens: vi.fn(),
  pageGradient: vi.fn(() => ''),
  PAGE_GRADIENT: '',
}))

describe('App', () => {
  it('renders without crashing', () => {
    render(<App />)
    expect(screen.getByRole('tablist')).toBeInTheDocument()
    expect(screen.getByText('添加新任务')).toBeInTheDocument()
  })

  it('switches between daily, weekly, and monthly tabs', async () => {
    render(<App />)

    const dailyTab = screen.getByRole('tab', { name: /每日清单/ })
    const weeklyTab = screen.getByRole('tab', { name: /每周清单/ })
    const monthlyTab = screen.getByRole('tab', { name: /每月清单/ })

    expect(dailyTab).toHaveAttribute('aria-selected', 'true')
    expect(weeklyTab).toHaveAttribute('aria-selected', 'false')
    expect(monthlyTab).toHaveAttribute('aria-selected', 'false')

    await act(async () => {
      fireEvent.click(weeklyTab)
    })

    expect(dailyTab).toHaveAttribute('aria-selected', 'false')
    expect(weeklyTab).toHaveAttribute('aria-selected', 'true')
    expect(monthlyTab).toHaveAttribute('aria-selected', 'false')

    await act(async () => {
      fireEvent.click(monthlyTab)
    })

    expect(dailyTab).toHaveAttribute('aria-selected', 'false')
    expect(weeklyTab).toHaveAttribute('aria-selected', 'false')
    expect(monthlyTab).toHaveAttribute('aria-selected', 'true')
  })

  it('adds a new item via AddItemForm', async () => {
    render(<App />)

    await act(async () => {
      fireEvent.click(screen.getByText('添加新任务'))
    })

    const input = screen.getByPlaceholderText('输入任务名称...')
    await act(async () => {
      fireEvent.change(input, { target: { value: '新测试任务' } })
    })

    await act(async () => {
      fireEvent.click(screen.getByText('添加'))
    })

    expect(screen.getByText('新测试任务')).toBeInTheDocument()
  })

  it('toggles an item completion state', async () => {
    render(<App />)

    await act(async () => {
      fireEvent.click(screen.getByText('添加新任务'))
    })

    const input = screen.getByPlaceholderText('输入任务名称...')
    await act(async () => {
      fireEvent.change(input, { target: { value: '待完成任务' } })
    })

    await act(async () => {
      fireEvent.click(screen.getByText('添加'))
    })

    const toggleButton = screen.getByRole('button', { name: /标记「待完成任务」为已完成/ })
    expect(toggleButton).toHaveAttribute('aria-pressed', 'false')

    await act(async () => {
      fireEvent.click(toggleButton)
    })

    expect(screen.getByRole('button', { name: /标记「待完成任务」为未完成/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })
})

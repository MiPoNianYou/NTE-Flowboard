import { render, screen, fireEvent, act } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { MotionConfig } from 'motion/react'
import App from '../../src/App'
import { LocalUiPreferencesProvider } from '../../src/context/LocalUiPreferencesContext'
import { ThemeProvider } from '../../src/context/ThemeContext'

vi.mock('../../src/utils/supabase')

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

vi.mock('../../src/utils/tagColors', () => ({
  getTagColors: vi.fn(() => ({ text: '#EF4444', backgroundColor: '#ef444424' })),
  cleanupRegistry: vi.fn(),
}))

function renderApp() {
  return render(
    <LocalUiPreferencesProvider>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </LocalUiPreferencesProvider>,
  )
}

describe('App', () => {
  it('respects the system reduced-motion preference', () => {
    renderApp()

    expect(vi.mocked(MotionConfig)).toHaveBeenLastCalledWith(
      expect.objectContaining({ reducedMotion: 'user' }),
      undefined,
    )
  })

  it('switches between daily, weekly, and monthly tabs', async () => {
    renderApp()

    expect(screen.getByText('添加新任务')).toBeInTheDocument()
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
    renderApp()

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
    renderApp()

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

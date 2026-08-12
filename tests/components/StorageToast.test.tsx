import { render, screen, act, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { StorageToast } from '../../src/components/StorageToast'
import { MS } from '../../src/utils/constants'
import { toastBus } from '../../src/utils/toastBus'
import {
  reportLegacyStorageConflict,
  reportLegacyStorageFailure,
} from '../../src/utils/legacyStorageEvents'

describe('StorageToast', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('should show toast when the toast bus emits an event', () => {
    vi.useFakeTimers()
    render(<StorageToast />)
    act(() => {
      toastBus.emit('保存失败', 'error', '数据读取失败')
    })
    expect(screen.getByText('数据读取失败')).toBeInTheDocument()
    expect(screen.getByText('保存失败')).toBeInTheDocument()
  })

  it('shows localized legacy migration events emitted before mounting', () => {
    reportLegacyStorageConflict()
    reportLegacyStorageFailure()

    render(<StorageToast />)

    expect(screen.getByText('旧数据冲突')).toBeInTheDocument()
    expect(screen.getByText('旧数据迁移未完成')).toBeInTheDocument()
  })

  it('should auto-dismiss after TOAST_DISMISS timeout', () => {
    vi.useFakeTimers()
    render(<StorageToast />)
    act(() => {
      toastBus.emit('错误信息', 'error')
    })
    expect(screen.getByText('错误信息')).toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(MS.TOAST_DISMISS)
    })

    expect(screen.queryByText('错误信息')).not.toBeInTheDocument()
  })

  it('should dismiss when X button is clicked', () => {
    vi.useFakeTimers()
    render(<StorageToast />)
    act(() => {
      toastBus.emit('手动关闭', 'error')
    })
    const closeButton = screen.getByRole('button', { name: '关闭通知' })
    act(() => {
      fireEvent.click(closeButton)
    })
    expect(screen.queryByText('手动关闭')).not.toBeInTheDocument()
  })

  it('should show multiple toasts', () => {
    vi.useFakeTimers()
    render(<StorageToast />)
    act(() => {
      toastBus.emit('第一个', 'error')
      toastBus.emit('第二个', 'error')
    })
    expect(screen.getByText('第一个')).toBeInTheDocument()
    expect(screen.getByText('第二个')).toBeInTheDocument()
    expect(screen.getAllByRole('status')[0]).toHaveTextContent('第二个')
  })

  it('should pause dismissal while the toast is hovered', () => {
    vi.useFakeTimers()
    render(<StorageToast />)
    act(() => {
      toastBus.emit('悬停期间不消失', 'error')
    })
    const toast = screen.getByRole('status')

    act(() => {
      fireEvent.mouseEnter(toast)
      vi.advanceTimersByTime(MS.TOAST_DISMISS)
    })
    expect(screen.getByText('悬停期间不消失')).toBeInTheDocument()

    act(() => {
      fireEvent.mouseLeave(toast)
      vi.advanceTimersByTime(MS.TOAST_DISMISS)
    })
    expect(screen.queryByText('悬停期间不消失')).not.toBeInTheDocument()
  })

  it('keeps a hovered toast paused when another toast arrives', () => {
    vi.useFakeTimers()
    render(<StorageToast />)
    act(() => {
      toastBus.emit('悬停期间不消失', 'error')
    })
    const toast = screen.getByText('悬停期间不消失').closest('[role="status"]') as HTMLElement

    act(() => {
      fireEvent.mouseEnter(toast)
      toastBus.emit('新的错误', 'error')
      vi.advanceTimersByTime(MS.TOAST_DISMISS)
    })
    expect(screen.getByText('悬停期间不消失')).toBeInTheDocument()

    act(() => {
      fireEvent.mouseLeave(toast)
      vi.advanceTimersByTime(MS.TOAST_DISMISS)
    })
    expect(screen.queryByText('悬停期间不消失')).not.toBeInTheDocument()
  })
})

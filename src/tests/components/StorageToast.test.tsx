import { render, screen, act, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { StorageToast } from '../../components/StorageToast'
import { MS } from '../../utils/constants'
import { toastBus } from '../../utils/toastBus'

describe('StorageToast', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('should show toast when the toast bus emits an event', () => {
    vi.useFakeTimers()
    render(<StorageToast />)
    act(() => {
      toastBus.emit('保存失败', 'error')
    })
    expect(screen.getByText('保存失败')).toBeInTheDocument()
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
    const closeButton = screen.getByRole('button')
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
  })
})

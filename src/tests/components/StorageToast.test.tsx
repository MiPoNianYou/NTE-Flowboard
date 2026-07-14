import { render, screen, act, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { StorageToast, showStorageToast } from '../../components/StorageToast'
import { MS } from '../../utils/constants'

describe('StorageToast', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('should show toast when showStorageToast is called', () => {
    vi.useFakeTimers()
    render(<StorageToast />)
    act(() => {
      showStorageToast('保存失败')
    })
    expect(screen.getByText('保存失败')).toBeInTheDocument()
  })

  it('should auto-dismiss after TOAST_DISMISS timeout', () => {
    vi.useFakeTimers()
    render(<StorageToast />)
    act(() => {
      showStorageToast('错误信息')
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
      showStorageToast('手动关闭')
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
      showStorageToast('第一个')
      showStorageToast('第二个')
    })
    expect(screen.getByText('第一个')).toBeInTheDocument()
    expect(screen.getByText('第二个')).toBeInTheDocument()
  })
})

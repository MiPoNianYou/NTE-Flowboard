import { act, render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { OfflineIndicator } from '../../src/components/OfflineIndicator'

vi.mock('lucide-react', () => ({
  WifiOff: (_props: Record<string, unknown>) => <svg data-testid="wifi-off" />,
  Wifi: (_props: Record<string, unknown>) => <svg data-testid="wifi" />,
}))

describe('OfflineIndicator', () => {
  const originalOnLine = Object.getOwnPropertyDescriptor(navigator, 'onLine')

  afterEach(() => {
    if (originalOnLine) {
      Object.defineProperty(navigator, 'onLine', originalOnLine)
    }
  })

  it('should render the offline state with its icon and message', () => {
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true })
    render(<OfflineIndicator />)

    expect(screen.getByText('离线模式，云同步暂不可用')).toBeInTheDocument()
    expect(screen.getByTestId('wifi-off')).toBeInTheDocument()
  })

  it('should react to connectivity changes and announce recovery', () => {
    vi.useFakeTimers()
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true })
    render(<OfflineIndicator />)
    expect(screen.queryByText('离线模式，云同步暂不可用')).not.toBeInTheDocument()

    act(() => window.dispatchEvent(new Event('offline')))
    expect(screen.getByText('离线模式，云同步暂不可用')).toBeInTheDocument()

    act(() => window.dispatchEvent(new Event('online')))
    expect(screen.getByText('网络已恢复，正在重新连接云同步')).toBeInTheDocument()
    expect(screen.getByTestId('wifi')).toBeInTheDocument()

    act(() => vi.advanceTimersByTime(2000))
    expect(screen.queryByText('网络已恢复，正在重新连接云同步')).not.toBeInTheDocument()
  })
})

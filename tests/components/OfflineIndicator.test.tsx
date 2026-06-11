import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { OfflineIndicator } from '../../src/components/OfflineIndicator'

vi.mock('motion/react')

vi.mock('lucide-react', () => ({
  WifiOff: (props: Record<string, unknown>) => <svg data-testid="wifi-off" />,
}))

describe('OfflineIndicator', () => {
  it('should show offline message when navigator.onLine is false', () => {
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true })
    render(<OfflineIndicator />)
    expect(screen.getByText('离线模式，云同步暂不可用')).toBeInTheDocument()
  })

  it('should not show when online', () => {
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true })
    render(<OfflineIndicator />)
    expect(screen.queryByText('离线模式，云同步暂不可用')).not.toBeInTheDocument()
  })

  it('should show icon', () => {
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true })
    render(<OfflineIndicator />)
    expect(screen.getByTestId('wifi-off')).toBeInTheDocument()
  })
})

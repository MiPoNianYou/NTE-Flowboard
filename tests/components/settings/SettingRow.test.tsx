import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { SettingRow } from '../../../src/components/settings/SettingRow'

describe('SettingRow', () => {
  it('should render label', () => {
    render(<SettingRow label="自动移动" trailing={null} />)
    expect(screen.getByText('自动移动')).toBeInTheDocument()
  })

  it('should render description when provided', () => {
    render(<SettingRow label="设置" description="详细说明" trailing={null} />)
    expect(screen.getByText('详细说明')).toBeInTheDocument()
  })

  it('should not render description when not provided', () => {
    render(<SettingRow label="设置" trailing={null} />)
    expect(screen.queryByText('详细说明')).not.toBeInTheDocument()
  })

  it('should render trailing element', () => {
    render(<SettingRow label="设置" trailing={<span data-testid="trailing">开关</span>} />)
    expect(screen.getByTestId('trailing')).toBeInTheDocument()
  })

  it('should merge custom className', () => {
    const { container } = render(<SettingRow label="设置" trailing={null} className="custom" />)
    expect((container.firstChild as HTMLElement).className).toContain('custom')
  })
})

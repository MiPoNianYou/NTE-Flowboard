import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { ToggleSwitch } from '../../src/components/base/ToggleSwitch'

describe('ToggleSwitch', () => {
  it('should render with unchecked state', () => {
    render(<ToggleSwitch checked={false} onCheckedChange={vi.fn()} />)
    const sw = screen.getByRole('switch')
    expect(sw).toHaveAttribute('aria-checked', 'false')
  })

  it('should render with checked state', () => {
    render(<ToggleSwitch checked={true} onCheckedChange={vi.fn()} />)
    const sw = screen.getByRole('switch')
    expect(sw).toHaveAttribute('aria-checked', 'true')
  })

  it('should call onCheckedChange with true when clicked while unchecked', () => {
    const onCheckedChange = vi.fn()
    render(<ToggleSwitch checked={false} onCheckedChange={onCheckedChange} />)
    fireEvent.click(screen.getByRole('switch'))
    expect(onCheckedChange).toHaveBeenCalledWith(true)
  })

  it('should call onCheckedChange with false when clicked while checked', () => {
    const onCheckedChange = vi.fn()
    render(<ToggleSwitch checked={true} onCheckedChange={onCheckedChange} />)
    fireEvent.click(screen.getByRole('switch'))
    expect(onCheckedChange).toHaveBeenCalledWith(false)
  })
})

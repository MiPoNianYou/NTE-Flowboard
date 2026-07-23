import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ToggleSwitch } from '../../../components/base/ToggleSwitch'

describe('ToggleSwitch', () => {
  it('uses the white accent foreground token for its thumb', () => {
    render(<ToggleSwitch checked onCheckedChange={vi.fn()} />)

    const thumb = screen.getByRole('switch').firstElementChild
    expect(thumb).toHaveClass('bg-[var(--color-text-on-accent)]')
  })

  it('uses the shared solid primary token when enabled', () => {
    render(<ToggleSwitch checked onCheckedChange={vi.fn()} />)

    const control = screen.getByRole('switch')
    expect(control).toHaveClass('bg-primary')
    expect(control).not.toHaveClass('bg-primary/80')
  })
})

import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ToggleSwitch } from '../../../src/components/base/ToggleSwitch'

describe('ToggleSwitch', () => {
  it.each([
    { checked: false, nextValue: true },
    { checked: true, nextValue: false },
  ])('reports the next checked value from checked=$checked', ({ checked, nextValue }) => {
    const onCheckedChange = vi.fn()
    render(
      <ToggleSwitch checked={checked} onCheckedChange={onCheckedChange} aria-label="自动置底" />,
    )

    const control = screen.getByRole('switch', { name: '自动置底' })
    expect(control).toHaveAttribute('aria-checked', String(checked))

    fireEvent.click(control)

    expect(onCheckedChange).toHaveBeenCalledWith(nextValue)
  })
})

import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Button } from '../../../src/components/base/Button'

describe('Button', () => {
  it('keeps its accessible name and exposes busy state while loading', () => {
    render(<Button isLoading>Sync now</Button>)

    const button = screen.getByRole('button', { name: 'Sync now' })
    expect(button).toHaveAttribute('aria-busy', 'true')
    expect(button).toBeDisabled()
  })
})

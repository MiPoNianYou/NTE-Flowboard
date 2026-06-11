import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { NavBar } from '../../src/components/base/NavBar'

describe('NavBar', () => {
  it('should render title', () => {
    render(<NavBar title="设置" />)
    expect(screen.getByText('设置')).toBeInTheDocument()
  })

  it('should render back button when onBack is provided', () => {
    const onBack = vi.fn()
    render(<NavBar title="设置" onBack={onBack} />)
    const backBtn = screen.getByRole('button')
    fireEvent.click(backBtn)
    expect(onBack).toHaveBeenCalledOnce()
  })

  it('should not render back button when onBack is not provided', () => {
    render(<NavBar title="设置" />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('should render rightContent when provided', () => {
    render(<NavBar title="设置" rightContent={<span data-testid="right">操作</span>} />)
    expect(screen.getByTestId('right')).toBeInTheDocument()
  })
})

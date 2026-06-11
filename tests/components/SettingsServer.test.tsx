import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { SettingsServer } from '../../src/components/SettingsServer'

vi.mock('motion/react')

describe('SettingsServer', () => {
  it('should render all server regions', () => {
    render(
      <SettingsServer
        resetConfig={{ serverRegion: 'asia' }}
        onResetConfigChange={vi.fn()}
        embedded
      />,
    )
    expect(screen.getByText('亚太服')).toBeInTheDocument()
    expect(screen.getByText('美服')).toBeInTheDocument()
    expect(screen.getByText('欧服')).toBeInTheDocument()
  })

  it('should highlight current region', () => {
    render(
      <SettingsServer
        resetConfig={{ serverRegion: 'america' }}
        onResetConfigChange={vi.fn()}
        embedded
      />,
    )
    const americaBtn = screen.getByText('美服').closest('button')!
    expect(americaBtn.className).toContain('bg-primary-soft')
  })

  it('should call onResetConfigChange when region clicked', () => {
    const onChange = vi.fn()
    render(
      <SettingsServer
        resetConfig={{ serverRegion: 'asia' }}
        onResetConfigChange={onChange}
        embedded
      />,
    )
    fireEvent.click(screen.getByText('欧服').closest('button')!)
    expect(onChange).toHaveBeenCalledWith({ serverRegion: 'europe' })
  })

  it('should render reset time info', () => {
    render(
      <SettingsServer
        resetConfig={{ serverRegion: 'asia' }}
        onResetConfigChange={vi.fn()}
        embedded
      />,
    )
    // "5:00 AM" appears twice (daily + weekly), use getAllByText
    expect(screen.getAllByText('5:00 AM').length).toBe(2)
  })

  it('should not render back button when embedded', () => {
    render(
      <SettingsServer
        resetConfig={{ serverRegion: 'asia' }}
        onResetConfigChange={vi.fn()}
        embedded
      />,
    )
    expect(screen.queryByLabelText('返回')).not.toBeInTheDocument()
  })
})

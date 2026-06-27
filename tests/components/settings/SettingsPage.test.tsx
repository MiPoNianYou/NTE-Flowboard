import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { SettingsPage } from '../../../src/components/settings/SettingsPage'



describe('SettingsPage', () => {
  it('should render children when embedded', () => {
    render(<SettingsPage title="设置" isEmbedded>嵌入内容</SettingsPage>)
    expect(screen.getByText('嵌入内容')).toBeInTheDocument()
  })

  it('should not render NavBar when embedded', () => {
    render(<SettingsPage title="设置" isEmbedded>嵌入内容</SettingsPage>)
    expect(screen.queryByLabelText('返回')).not.toBeInTheDocument()
  })

  it('should render NavBar with title when not embedded', () => {
    render(<SettingsPage title="设置" onBack={vi.fn()}>页面内容</SettingsPage>)
    expect(screen.getByText('设置')).toBeInTheDocument()
    expect(screen.getByText('页面内容')).toBeInTheDocument()
  })

  it('should render children when not embedded', () => {
    render(<SettingsPage title="设置" onBack={vi.fn()}>子内容</SettingsPage>)
    expect(screen.getByText('子内容')).toBeInTheDocument()
  })

  it('should call onBack when back button is clicked', () => {
    const onBack = vi.fn()
    const { container } = render(<SettingsPage title="设置" onBack={onBack}>内容</SettingsPage>)
    const buttons = container.querySelectorAll('button')
    fireEvent.click(buttons[0])
    expect(onBack).toHaveBeenCalledOnce()
  })
})

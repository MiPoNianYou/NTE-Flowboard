import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { Header } from '../../src/components/Header'
import type { ChecklistData, SettingsProps } from '../../src/types'

vi.mock('motion/react')

vi.mock('../../src/assets/logo', () => ({
  logoDataUri: 'data:image/webp;base64,mock',
}))

const mockData: ChecklistData = {
  daily: [],
  weekly: [],
  custom: [],
  resetConfig: { serverRegion: 'asia' },
  lastDailyReset: new Date().toISOString(),
  lastWeeklyReset: new Date().toISOString(),
}

const mockSettings: SettingsProps = {
  autoMoveCompleted: true,
  onAutoMoveCompletedChange: vi.fn(),
  confirmDelete: true,
  onConfirmDeleteChange: vi.fn(),
  cloudSyncBehavior: false,
  onCloudSyncBehaviorChange: vi.fn(),
  showCustomTab: false,
  onShowCustomTabChange: vi.fn(),
}

describe('Header', () => {
  it('should render app title', () => {
    render(
      <Header
        layout="single"
        toggleLayout={vi.fn()}
        data={mockData}
        onManualReset={vi.fn()}
        onImport={vi.fn()}
        onResetConfigChange={vi.fn()}
        settings={mockSettings}
      />,
    )
    expect(screen.getByText('NTE Flowboard')).toBeInTheDocument()
  })

  it('should render subtitle', () => {
    render(
      <Header
        layout="single"
        toggleLayout={vi.fn()}
        data={mockData}
        onManualReset={vi.fn()}
        onImport={vi.fn()}
        onResetConfigChange={vi.fn()}
        settings={mockSettings}
      />,
    )
    expect(screen.getByText('每日与每周事项追踪')).toBeInTheDocument()
  })

  it('should render logo image', () => {
    render(
      <Header
        layout="single"
        toggleLayout={vi.fn()}
        data={mockData}
        onManualReset={vi.fn()}
        onImport={vi.fn()}
        onResetConfigChange={vi.fn()}
        settings={mockSettings}
      />,
    )
    const img = screen.getByAltText('Nanally')
    expect(img).toBeInTheDocument()
  })

  it('should render GitHub link', () => {
    render(
      <Header
        layout="single"
        toggleLayout={vi.fn()}
        data={mockData}
        onManualReset={vi.fn()}
        onImport={vi.fn()}
        onResetConfigChange={vi.fn()}
        settings={mockSettings}
      />,
    )
    const link = screen.getByLabelText('GitHub')
    expect(link).toHaveAttribute('href', 'https://github.com/MiPoNianYou/NTE-Flowboard')
  })

  it('should call toggleLayout when layout button clicked', () => {
    const toggleLayout = vi.fn()
    render(
      <Header
        layout="single"
        toggleLayout={toggleLayout}
        data={mockData}
        onManualReset={vi.fn()}
        onImport={vi.fn()}
        onResetConfigChange={vi.fn()}
        settings={mockSettings}
      />,
    )
    const layoutBtn = screen.getByLabelText('切换为双列布局')
    fireEvent.click(layoutBtn)
    expect(toggleLayout).toHaveBeenCalledOnce()
  })

  it('should render settings button', () => {
    render(
      <Header
        layout="single"
        toggleLayout={vi.fn()}
        data={mockData}
        onManualReset={vi.fn()}
        onImport={vi.fn()}
        onResetConfigChange={vi.fn()}
        settings={mockSettings}
      />,
    )
    expect(screen.getByLabelText('打开设置')).toBeInTheDocument()
  })

  it('should show correct layout toggle label for two-column', () => {
    render(
      <Header
        layout="two-column"
        toggleLayout={vi.fn()}
        data={mockData}
        onManualReset={vi.fn()}
        onImport={vi.fn()}
        onResetConfigChange={vi.fn()}
        settings={mockSettings}
      />,
    )
    expect(screen.getByLabelText('切换为单列布局')).toBeInTheDocument()
  })
})

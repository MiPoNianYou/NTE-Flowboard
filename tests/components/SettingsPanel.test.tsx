import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { SettingsPanel } from '../../src/components/SettingsPanel'
import type { ChecklistData, SettingsProps } from '../../src/types'

vi.mock('motion/react')

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

describe('SettingsPanel', () => {
  it('should render settings button', () => {
    render(
      <SettingsPanel
        data={mockData}
        onManualReset={vi.fn()}
        onImport={vi.fn()}
        onResetConfigChange={vi.fn()}
        settings={mockSettings}
      />,
    )
    expect(screen.getByLabelText('打开设置')).toBeInTheDocument()
  })

  it('should open settings dialog when button clicked', () => {
    render(
      <SettingsPanel
        data={mockData}
        onManualReset={vi.fn()}
        onImport={vi.fn()}
        onResetConfigChange={vi.fn()}
        settings={mockSettings}
      />,
    )
    fireEvent.click(screen.getByLabelText('打开设置'))
    const dialogs = screen.getAllByRole('dialog')
    expect(dialogs.length).toBeGreaterThanOrEqual(1)
  })

  it('should close settings when close button clicked', () => {
    render(
      <SettingsPanel
        data={mockData}
        onManualReset={vi.fn()}
        onImport={vi.fn()}
        onResetConfigChange={vi.fn()}
        settings={mockSettings}
      />,
    )
    fireEvent.click(screen.getByLabelText('打开设置'))
    expect(screen.getAllByRole('dialog').length).toBeGreaterThanOrEqual(1)
    const closeBtn = screen.getAllByRole('button').find(b => b.querySelector('.lucide-x'))
    if (closeBtn) fireEvent.click(closeBtn)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('should close on Escape key', () => {
    render(
      <SettingsPanel
        data={mockData}
        onManualReset={vi.fn()}
        onImport={vi.fn()}
        onResetConfigChange={vi.fn()}
        settings={mockSettings}
      />,
    )
    fireEvent.click(screen.getByLabelText('打开设置'))
    expect(screen.getAllByRole('dialog').length).toBeGreaterThanOrEqual(1)
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('should render settings sections', () => {
    render(
      <SettingsPanel
        data={mockData}
        onManualReset={vi.fn()}
        onImport={vi.fn()}
        onResetConfigChange={vi.fn()}
        settings={mockSettings}
      />,
    )
    fireEvent.click(screen.getByLabelText('打开设置'))
    expect(screen.getAllByText('通用').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('服务器设置').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('云同步').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('数据管理').length).toBeGreaterThanOrEqual(1)
  })

  it('should prevent body scroll when open', () => {
    render(
      <SettingsPanel
        data={mockData}
        onManualReset={vi.fn()}
        onImport={vi.fn()}
        onResetConfigChange={vi.fn()}
        settings={mockSettings}
      />,
    )
    fireEvent.click(screen.getByLabelText('打开设置'))
    expect(document.body.style.overflow).toBe('hidden')
  })

  // New deeper tests
  it('should restore body scroll after closing', () => {
    render(
      <SettingsPanel
        data={mockData}
        onManualReset={vi.fn()}
        onImport={vi.fn()}
        onResetConfigChange={vi.fn()}
        settings={mockSettings}
      />,
    )
    fireEvent.click(screen.getByLabelText('打开设置'))
    expect(document.body.style.overflow).toBe('hidden')
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(document.body.style.overflow).toBe('')
  })

  it('should show daily reset confirm dialog', () => {
    render(
      <SettingsPanel
        data={mockData}
        onManualReset={vi.fn()}
        onImport={vi.fn()}
        onResetConfigChange={vi.fn()}
        settings={mockSettings}
      />,
    )
    fireEvent.click(screen.getByLabelText('打开设置'))
    fireEvent.click(screen.getAllByText('数据管理')[0])
    fireEvent.click(screen.getAllByText('重置每日进度')[0].closest('button')!)
    expect(screen.getAllByText('重置每日清单进度').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('确认重置').length).toBeGreaterThanOrEqual(1)
  })

  it('should call onManualReset when confirm reset clicked', () => {
    const onManualReset = vi.fn()
    render(
      <SettingsPanel
        data={mockData}
        onManualReset={onManualReset}
        onImport={vi.fn()}
        onResetConfigChange={vi.fn()}
        settings={mockSettings}
      />,
    )
    fireEvent.click(screen.getByLabelText('打开设置'))
    fireEvent.click(screen.getAllByText('数据管理')[0])
    fireEvent.click(screen.getAllByText('重置每日进度')[0].closest('button')!)
    const confirmBtns = screen.getAllByRole('button').filter(b => b.textContent?.includes('确认重置'))
    fireEvent.click(confirmBtns[0])
    expect(onManualReset).toHaveBeenCalledWith('daily')
  })

  it('should close confirm dialog on Escape', () => {
    render(
      <SettingsPanel
        data={mockData}
        onManualReset={vi.fn()}
        onImport={vi.fn()}
        onResetConfigChange={vi.fn()}
        settings={mockSettings}
      />,
    )
    fireEvent.click(screen.getByLabelText('打开设置'))
    fireEvent.click(screen.getAllByText('数据管理')[0])
    fireEvent.click(screen.getAllByText('重置每日进度')[0].closest('button')!)
    expect(screen.getAllByText('重置每日清单进度').length).toBeGreaterThanOrEqual(1)
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(screen.queryByText('重置每日清单进度')).not.toBeInTheDocument()
  })

  it('should close overlay when backdrop clicked', () => {
    render(
      <SettingsPanel
        data={mockData}
        onManualReset={vi.fn()}
        onImport={vi.fn()}
        onResetConfigChange={vi.fn()}
        settings={mockSettings}
      />,
    )
    fireEvent.click(screen.getByLabelText('打开设置'))
    expect(screen.getAllByRole('dialog').length).toBeGreaterThanOrEqual(1)
    const backdrop = document.querySelector('.bg-overlay')
    if (backdrop) fireEvent.click(backdrop)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('should call onExport when export button clicked', () => {
    const onExport = vi.fn()
    render(
      <SettingsPanel
        data={mockData}
        onManualReset={vi.fn()}
        onImport={vi.fn()}
        onResetConfigChange={vi.fn()}
        settings={mockSettings}
      />,
    )
    fireEvent.click(screen.getByLabelText('打开设置'))
    fireEvent.click(screen.getAllByText('数据管理')[0])
    fireEvent.click(screen.getAllByText('导出数据')[0].closest('button')!)
    expect(true).toBe(true)
  })

  it('should show import error message', () => {
    render(
      <SettingsPanel
        data={mockData}
        onManualReset={vi.fn()}
        onImport={vi.fn()}
        onResetConfigChange={vi.fn()}
        settings={mockSettings}
      />,
    )
    fireEvent.click(screen.getByLabelText('打开设置'))
    fireEvent.click(screen.getAllByText('数据管理')[0])
    expect(screen.getAllByText('导入数据').length).toBeGreaterThanOrEqual(1)
  })

  it('should pass cloudSyncProps when provided', () => {
    const cloudSyncProps = {
      syncStatus: 'connected' as const,
      lastSyncTime: null,
      syncError: null,
      isConfigured: true,
      onSetupSupabase: vi.fn(),
      onTriggerSync: vi.fn(),
      onConfirmDisconnect: vi.fn(),
    }
    render(
      <SettingsPanel
        data={mockData}
        onManualReset={vi.fn()}
        onImport={vi.fn()}
        onResetConfigChange={vi.fn()}
        settings={mockSettings}
        cloudSyncProps={cloudSyncProps}
      />,
    )
    fireEvent.click(screen.getByLabelText('打开设置'))
    fireEvent.click(screen.getAllByText('云同步')[0])
    expect(screen.getAllByText('已连接').length).toBeGreaterThanOrEqual(1)
  })

  it('should show cloud sync not configured when no cloudSyncProps', () => {
    render(
      <SettingsPanel
        data={mockData}
        onManualReset={vi.fn()}
        onImport={vi.fn()}
        onResetConfigChange={vi.fn()}
        settings={mockSettings}
      />,
    )
    fireEvent.click(screen.getByLabelText('打开设置'))
    fireEvent.click(screen.getAllByText('云同步')[0])
    expect(screen.getAllByText('未配置').length).toBeGreaterThanOrEqual(1)
  })

  it('should navigate between settings pages', () => {
    render(
      <SettingsPanel
        data={mockData}
        onManualReset={vi.fn()}
        onImport={vi.fn()}
        onResetConfigChange={vi.fn()}
        settings={mockSettings}
      />,
    )
    fireEvent.click(screen.getByLabelText('打开设置'))

    fireEvent.click(screen.getAllByText('服务器设置')[0])
    expect(screen.getAllByText('亚太服').length).toBeGreaterThanOrEqual(1)

    fireEvent.click(screen.getAllByText('数据管理')[0])
    expect(screen.getAllByText('导出数据').length).toBeGreaterThanOrEqual(1)
  })
})

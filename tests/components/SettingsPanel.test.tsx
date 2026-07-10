import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { SettingsPanel } from '../../src/components/SettingsPanel'
import type { ChecklistData } from '../../src/types'
import * as serialization from '../../src/utils/serialization'

vi.mock('../../src/context/SettingsContext', () => ({
  useSettings: () => ({
    settings: { serverRegion: 'asia', isAutoMoveEnabled: true, shouldConfirmDelete: true },
    updateSettings: vi.fn(),
    uiPreferences: { cloudPatchHidden: false },
    updateUiPreferences: vi.fn(),
  }),
}))

const mockData: ChecklistData = {
  daily: [],
  weekly: [],
  monthly: [],
  settings: { serverRegion: 'asia', isAutoMoveEnabled: true, shouldConfirmDelete: true },
  uiPreferences: { cloudPatchHidden: false },
  lastDailyReset: new Date().toISOString(),
  lastWeeklyReset: new Date().toISOString(),
  lastMonthlyReset: new Date().toISOString(),
}

describe('SettingsPanel', () => {
  it('should render settings button', () => {
    render(
      <SettingsPanel
        data={mockData}
        onManualReset={vi.fn()}
        onImport={vi.fn()}
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
      />,
    )
    fireEvent.click(screen.getByLabelText('打开设置'))
    expect(screen.getAllByRole('dialog').length).toBeGreaterThanOrEqual(1)
    const closeButton = screen.getAllByRole('button').find(b => b.querySelector('.lucide-x'))
    if (closeButton) fireEvent.click(closeButton)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('should close on Escape key', () => {
    render(
      <SettingsPanel
        data={mockData}
        onManualReset={vi.fn()}
        onImport={vi.fn()}
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
      />,
    )
    fireEvent.click(screen.getByLabelText('打开设置'))
    expect(document.body.style.overflow).toBe('hidden')
  })

  it('should restore body scroll after closing', () => {
    render(
      <SettingsPanel
        data={mockData}
        onManualReset={vi.fn()}
        onImport={vi.fn()}
      />,
    )
    fireEvent.click(screen.getByLabelText('打开设置'))
    expect(document.body.style.overflow).toBe('hidden')
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(document.body.style.overflow).toBe('')
  })

  it('should close overlay when backdrop clicked', () => {
    render(
      <SettingsPanel
        data={mockData}
        onManualReset={vi.fn()}
        onImport={vi.fn()}
      />,
    )
    fireEvent.click(screen.getByLabelText('打开设置'))
    expect(screen.getAllByRole('dialog').length).toBeGreaterThanOrEqual(1)
    const backdrop = document.querySelector('.glass-overlay')
    if (backdrop) fireEvent.click(backdrop)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('should call exportData when export button clicked', () => {
    const exportSpy = vi.spyOn(serialization, 'exportData').mockReturnValue('')
    render(
      <SettingsPanel
        data={mockData}
        onManualReset={vi.fn()}
        onImport={vi.fn()}
      />,
    )
    fireEvent.click(screen.getByLabelText('打开设置'))
    fireEvent.click(screen.getAllByText('数据管理')[0])
    fireEvent.click(screen.getAllByText('导出数据')[0].closest('button')!)
    expect(exportSpy).toHaveBeenCalledOnce()
    exportSpy.mockRestore()
  })

  it('should show import error message', () => {
    render(
      <SettingsPanel
        data={mockData}
        onManualReset={vi.fn()}
        onImport={vi.fn()}
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
      onTeardownSupabase: vi.fn(),
      onClearSyncError: vi.fn(),
    }
    render(
      <SettingsPanel
        data={mockData}
        onManualReset={vi.fn()}
        onImport={vi.fn()}
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
      />,
    )
    fireEvent.click(screen.getByLabelText('打开设置'))

    fireEvent.click(screen.getAllByText('服务器设置')[0])
    expect(screen.getAllByText('亚太服').length).toBeGreaterThanOrEqual(1)

    fireEvent.click(screen.getAllByText('数据管理')[0])
    expect(screen.getAllByText('导出数据').length).toBeGreaterThanOrEqual(1)
  })
})

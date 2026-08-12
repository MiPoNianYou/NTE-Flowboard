import type { ComponentProps, ReactNode } from 'react'
import { act, render as renderBase, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { SettingsPanel as BaseSettingsPanel } from '../../src/components/SettingsPanel'
import { LocalUiPreferencesProvider } from '../../src/context/LocalUiPreferencesContext'
import { ThemeProvider } from '../../src/context/ThemeContext'
import type { ChecklistData } from '../../src/types'
import * as serialization from '../../src/utils/serialization'
import i18n from '../../src/i18n'

function render(ui: ReactNode) {
  return renderBase(
    <LocalUiPreferencesProvider>
      <ThemeProvider>{ui}</ThemeProvider>
    </LocalUiPreferencesProvider>,
  )
}

type SettingsPanelProps = Omit<
  ComponentProps<typeof BaseSettingsPanel>,
  'restoreDefaultsControls'
> & {
  onRestoreDefaults?: () => Promise<'success'>
  onUndoRestoreDefaults?: () => Promise<'success'>
  hasRestoreBackup?: boolean
  hasChangesSinceRestore?: boolean
}

function SettingsPanel({
  onRestoreDefaults = async () => 'success',
  onUndoRestoreDefaults = async () => 'success',
  hasRestoreBackup = false,
  hasChangesSinceRestore = false,
  ...props
}: SettingsPanelProps) {
  return (
    <BaseSettingsPanel
      {...props}
      restoreDefaultsControls={{
        onRestoreDefaults,
        onUndoRestoreDefaults,
        hasRestoreBackup,
        hasChangesSinceRestore,
      }}
    />
  )
}

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

function renderSettingsPanel(overrides: Partial<SettingsPanelProps> = {}) {
  return render(
    <SettingsPanel data={mockData} onManualReset={vi.fn()} onImport={vi.fn()} {...overrides} />,
  )
}

describe('SettingsPanel', () => {
  it('should open the settings dialog from its named trigger', () => {
    renderSettingsPanel()
    const trigger = screen.getByRole('button', { name: '打开设置' })
    fireEvent.click(trigger)
    const dialogs = screen.getAllByRole('dialog')
    expect(dialogs.length).toBeGreaterThanOrEqual(1)
  })

  it('should show a return control without a mobile close button while viewing a settings page', () => {
    renderSettingsPanel()
    fireEvent.click(screen.getByLabelText('打开设置'))
    fireEvent.click(screen.getAllByText('服务器设置')[0])

    expect(screen.getAllByLabelText('返回设置').length).toBeGreaterThanOrEqual(1)
    expect(document.querySelectorAll('.lucide-x')).toHaveLength(0)
  })

  it('should localize the mobile return control with its destination', async () => {
    renderSettingsPanel()
    await act(async () => {
      await i18n.changeLanguage('en-US')
    })
    fireEvent.click(screen.getByLabelText('Open settings'))
    fireEvent.click(screen.getAllByText('Server')[0])

    expect(screen.getAllByLabelText('Back to Settings').length).toBeGreaterThanOrEqual(1)
  })

  it('should close on Escape, restore focus, and release the body scroll lock', () => {
    renderSettingsPanel()
    const settingsButton = screen.getByLabelText('打开设置')
    fireEvent.click(settingsButton)
    expect(document.body.style.overflow).toBe('hidden')

    fireEvent.keyDown(window, { key: 'Escape' })

    expect(settingsButton).toHaveFocus()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(document.body.style.overflow).toBe('')
  })

  it('should close overlay when backdrop clicked', () => {
    renderSettingsPanel()
    fireEvent.click(screen.getByLabelText('打开设置'))
    expect(screen.getAllByRole('dialog').length).toBeGreaterThanOrEqual(1)
    const backdrop = document.querySelector('.glass-overlay')
    if (backdrop) fireEvent.click(backdrop)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('should call exportData when export button clicked', () => {
    const exportSpy = vi.spyOn(serialization, 'exportData').mockReturnValue('')
    const anchorClickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined)
    renderSettingsPanel()
    fireEvent.click(screen.getByLabelText('打开设置'))
    fireEvent.click(screen.getAllByText('数据管理')[0])
    fireEvent.click(screen.getAllByText('导出数据')[0].closest('button')!)
    expect(exportSpy).toHaveBeenCalledOnce()
    expect(anchorClickSpy).toHaveBeenCalledOnce()
    exportSpy.mockRestore()
    anchorClickSpy.mockRestore()
  })

  it('should pass the restore-defaults action through the settings layout', async () => {
    const onRestoreDefaults = vi.fn(async () => 'success' as const)
    renderSettingsPanel({ onRestoreDefaults })
    fireEvent.click(screen.getByLabelText('打开设置'))
    fireEvent.click(screen.getAllByText('数据管理')[0])
    fireEvent.click(screen.getAllByText('恢复默认清单')[0].closest('button')!)
    fireEvent.click(
      document.querySelectorAll<HTMLButtonElement>('[data-restore-defaults-action]')[0],
    )
    fireEvent.click(screen.getAllByText('确认恢复所有默认清单？')[0].closest('button')!)

    expect(await screen.findAllByText('默认清单已恢复')).not.toHaveLength(0)
    expect(onRestoreDefaults).toHaveBeenCalledOnce()
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
    renderSettingsPanel({ cloudSyncProps })
    fireEvent.click(screen.getByLabelText('打开设置'))
    fireEvent.click(screen.getAllByText('云同步')[0])
    expect(screen.getAllByText('已连接').length).toBeGreaterThanOrEqual(1)
  })

  it('should show cloud sync not configured when no cloudSyncProps', () => {
    renderSettingsPanel()
    fireEvent.click(screen.getByLabelText('打开设置'))
    fireEvent.click(screen.getAllByText('云同步')[0])
    expect(screen.getAllByText('未配置').length).toBeGreaterThanOrEqual(1)
  })

  it('should navigate between settings pages', () => {
    renderSettingsPanel()
    fireEvent.click(screen.getByLabelText('打开设置'))

    fireEvent.click(screen.getAllByText('服务器设置')[0])
    expect(screen.getAllByText('亚太服').length).toBeGreaterThanOrEqual(1)

    fireEvent.click(screen.getAllByText('数据管理')[0])
    expect(screen.getAllByText('导出数据').length).toBeGreaterThanOrEqual(1)
  })
})

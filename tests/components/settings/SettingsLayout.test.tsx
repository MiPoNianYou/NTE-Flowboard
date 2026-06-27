import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { SettingsLayout } from '../../../src/components/settings/SettingsLayout'

vi.mock('../../../src/components/settings/SettingsGeneral', () => ({
  SettingsGeneral: () => <div data-testid="settings-general">General Content</div>,
}))

vi.mock('../../../src/components/settings/SettingsServer', () => ({
  SettingsServer: () => <div data-testid="settings-server">Server Content</div>,
}))

vi.mock('../../../src/components/settings/SettingsData', () => ({
  SettingsData: () => <div data-testid="settings-data">Data Content</div>,
}))

vi.mock('../../../src/components/settings/CloudSyncSection', () => ({
  CloudSyncSection: () => <div data-testid="cloud-sync-section">Cloud Content</div>,
}))

let mockServerRegion = 'asia'

vi.mock('../../../src/context/SettingsContext', () => ({
  useSettings: () => ({
    settings: { serverRegion: mockServerRegion, isAutoMoveEnabled: true, shouldConfirmDelete: true },
    updateSettings: vi.fn(),
  }),
}))

const mockProps = {
  onManualReset: vi.fn(),
  onExport: vi.fn(),
  onImportFile: vi.fn(),
  fileInputRef: { current: null },
  isImportError: false,
  isImportSuccess: false,
  isExportSuccess: false,
}

describe('SettingsLayout', () => {
  it('should render navigation items', () => {
    render(<SettingsLayout {...mockProps} />)
    expect(screen.getAllByText('通用').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('服务器设置').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('云同步').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('数据管理').length).toBeGreaterThanOrEqual(1)
  })

  it('should render general content by default', () => {
    render(<SettingsLayout {...mockProps} />)
    expect(screen.getByTestId('settings-general')).toBeInTheDocument()
  })

  it('should show server region label in sidebar', () => {
    mockServerRegion = 'europe'
    render(<SettingsLayout {...mockProps} />)
    expect(screen.getAllByText('欧服').length).toBeGreaterThanOrEqual(1)
    mockServerRegion = 'asia'
  })

  it('should show cloud status label when cloudSyncProps provided', () => {
    const props = {
      ...mockProps,
      cloudSyncProps: {
        syncStatus: 'disconnected' as const,
        lastSyncTime: null,
        syncError: null,
        isConfigured: false,
        onSetupSupabase: vi.fn(),
        onTriggerSync: vi.fn(),
        onTeardownSupabase: vi.fn(),
        onClearSyncError: vi.fn(),
      },
    }
    render(<SettingsLayout {...props} />)
    expect(screen.getAllByText('未配置').length).toBeGreaterThanOrEqual(1)
  })

  it('should show connected status when configured', () => {
    const props = {
      ...mockProps,
      cloudSyncProps: {
        syncStatus: 'connected' as const,
        lastSyncTime: new Date().toISOString(),
        syncError: null,
        isConfigured: true,
        onSetupSupabase: vi.fn(),
        onTriggerSync: vi.fn(),
        onTeardownSupabase: vi.fn(),
        onClearSyncError: vi.fn(),
      },
    }
    render(<SettingsLayout {...props} />)
    expect(screen.getAllByText('已连接').length).toBeGreaterThanOrEqual(1)
  })
})

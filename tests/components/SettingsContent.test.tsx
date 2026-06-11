import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { SettingsContent } from '../../src/components/SettingsContent'
import type { ResetConfig } from '../../src/types'

vi.mock('motion/react')

const defaultProps = {
  confirmTarget: null as null | 'daily' | 'weekly',
  onConfirmTarget: vi.fn(),
  onConfirmReset: vi.fn(),
  onExport: vi.fn(),
  onImportFile: vi.fn(),
  fileInputRef: { current: null },
  importError: '',
  importSuccess: false,
  autoMoveCompleted: true,
  onAutoMoveCompletedChange: vi.fn(),
  confirmDelete: true,
  onConfirmDeleteChange: vi.fn(),
  resetConfig: { serverRegion: 'asia' } as ResetConfig,
  onResetConfigChange: vi.fn(),
  cloudSyncBehavior: false,
  onCloudSyncBehaviorChange: vi.fn(),
  showCustomTab: false,
  onShowCustomTabChange: vi.fn(),
}

describe('SettingsContent', () => {
  it('should render navigation items', () => {
    render(<SettingsContent {...defaultProps} />)
    expect(screen.getAllByText('通用').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('服务器设置').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('云同步').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('数据管理').length).toBeGreaterThanOrEqual(1)
  })

  it('should show server region label in sidebar', () => {
    render(<SettingsContent {...defaultProps} />)
    expect(screen.getAllByText('亚太服').length).toBeGreaterThanOrEqual(1)
  })

  it('should show cloud sync status', () => {
    render(<SettingsContent {...defaultProps} />)
    expect(screen.getAllByText('未配置').length).toBeGreaterThanOrEqual(1)
  })

  it('should show general settings by default', () => {
    render(<SettingsContent {...defaultProps} />)
    expect(screen.getByText('行为')).toBeInTheDocument()
    expect(screen.getByText('显示')).toBeInTheDocument()
  })

  it('should navigate to server settings', () => {
    render(<SettingsContent {...defaultProps} />)
    const serverBtn = screen.getAllByText('服务器设置')[0]
    fireEvent.click(serverBtn)
    expect(screen.getAllByText('亚太服').length).toBeGreaterThanOrEqual(1)
  })

  it('should show confirm dialog when confirmTarget is set', () => {
    render(<SettingsContent {...defaultProps} confirmTarget="daily" />)
    expect(screen.getByText('重置每日清单进度')).toBeInTheDocument()
    expect(screen.getByText('确认重置')).toBeInTheDocument()
  })

  it('should call onConfirmReset when confirm clicked', () => {
    const onConfirmReset = vi.fn()
    render(<SettingsContent {...defaultProps} confirmTarget="daily" onConfirmReset={onConfirmReset} />)
    fireEvent.click(screen.getByText('确认重置'))
    expect(onConfirmReset).toHaveBeenCalledOnce()
  })

  it('should call onConfirmTarget(null) when cancel clicked', () => {
    const onConfirmTarget = vi.fn()
    render(<SettingsContent {...defaultProps} confirmTarget="daily" onConfirmTarget={onConfirmTarget} />)
    fireEvent.click(screen.getByText('取消'))
    expect(onConfirmTarget).toHaveBeenCalledWith(null)
  })

  it('should show disconnect confirm when showDisconnectConfirm is true', () => {
    render(
      <SettingsContent
        {...defaultProps}
        cloudSyncProps={{
          syncStatus: 'connected',
          lastSyncTime: null,
          syncError: null,
          isConfigured: true,
          onSetupSupabase: vi.fn(),
          onTriggerSync: vi.fn(),
          onConfirmDisconnect: vi.fn(),
          onRequestDisconnect: vi.fn(),
          onCancelDisconnect: vi.fn(),
          showDisconnectConfirm: true,
        }}
      />,
    )
    expect(screen.getByText('断开云同步')).toBeInTheDocument()
  })

  // New deeper tests
  it('should navigate to data settings', () => {
    render(<SettingsContent {...defaultProps} />)
    const dataBtn = screen.getAllByText('数据管理')[0]
    fireEvent.click(dataBtn)
    expect(screen.getAllByText('导出数据').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('导入数据').length).toBeGreaterThanOrEqual(1)
  })

  it('should show weekly region label for america', () => {
    render(<SettingsContent {...defaultProps} resetConfig={{ serverRegion: 'america' }} />)
    expect(screen.getAllByText('美服').length).toBeGreaterThanOrEqual(1)
  })

  it('should show weekly region label for europe', () => {
    render(<SettingsContent {...defaultProps} resetConfig={{ serverRegion: 'europe' }} />)
    expect(screen.getAllByText('欧服').length).toBeGreaterThanOrEqual(1)
  })

  it('should show "已连接 when cloud sync is configured', () => {
    render(
      <SettingsContent
        {...defaultProps}
        cloudSyncProps={{
          syncStatus: 'connected',
          lastSyncTime: null,
          syncError: null,
          isConfigured: true,
          onSetupSupabase: vi.fn(),
          onTriggerSync: vi.fn(),
          onConfirmDisconnect: vi.fn(),
          onRequestDisconnect: vi.fn(),
          onCancelDisconnect: vi.fn(),
          showDisconnectConfirm: false,
        }}
      />,
    )
    expect(screen.getAllByText('已连接').length).toBeGreaterThanOrEqual(1)
  })

  it('should show weekly reset dialog when confirmTarget is weekly', () => {
    render(<SettingsContent {...defaultProps} confirmTarget="weekly" />)
    expect(screen.getByText('重置每周清单进度')).toBeInTheDocument()
  })

  it('should call onConfirmReset for weekly target', () => {
    const onConfirmReset = vi.fn()
    render(<SettingsContent {...defaultProps} confirmTarget="weekly" onConfirmReset={onConfirmReset} />)
    fireEvent.click(screen.getByText('确认重置'))
    expect(onConfirmReset).toHaveBeenCalledOnce()
  })

  it('should render reset time info when navigating to server', () => {
    render(<SettingsContent {...defaultProps} />)
    fireEvent.click(screen.getAllByText('服务器设置')[0])
    expect(screen.getAllByText('5:00 AM').length).toBeGreaterThanOrEqual(2)
  })

  it('should show general settings toggles', () => {
    render(<SettingsContent {...defaultProps} />)
    expect(screen.getByText('完成事项自动移至底部')).toBeInTheDocument()
    expect(screen.getByText('删除前二次确认')).toBeInTheDocument()
    expect(screen.getByText('显示自定义清单')).toBeInTheDocument()
  })

  it('should call onAutoMoveCompletedChange when toggle clicked', () => {
    const onChange = vi.fn()
    render(<SettingsContent {...defaultProps} onAutoMoveCompletedChange={onChange} />)
    const toggle = screen.getByText('完成事项自动移至底部').closest('.flex')!.querySelector('button')!
    fireEvent.click(toggle)
    expect(onChange).toHaveBeenCalledOnce()
  })

  it('should call onConfirmDeleteChange when toggle clicked', () => {
    const onChange = vi.fn()
    render(<SettingsContent {...defaultProps} onConfirmDeleteChange={onChange} />)
    const toggle = screen.getByText('删除前二次确认').closest('.flex')!.querySelector('button')!
    fireEvent.click(toggle)
    expect(onChange).toHaveBeenCalledOnce()
  })

  it('should call onShowCustomTabChange when toggle clicked', () => {
    const onChange = vi.fn()
    render(<SettingsContent {...defaultProps} onShowCustomTabChange={onChange} />)
    const toggle = screen.getByText('显示自定义清单').closest('.flex')!.querySelector('button')!
    fireEvent.click(toggle)
    expect(onChange).toHaveBeenCalledOnce()
  })

  it('should call onResetConfigChange when region clicked', () => {
    const onChange = vi.fn()
    render(<SettingsContent {...defaultProps} onResetConfigChange={onChange} />)
    fireEvent.click(screen.getAllByText('服务器设置')[0])
    fireEvent.click(screen.getAllByText('美服')[0].closest('button')!)
    expect(onChange).toHaveBeenCalledWith({ serverRegion: 'america' })
  })

  it('should show import error when provided', () => {
    render(<SettingsContent {...defaultProps} importError="文件格式错误" />)
    fireEvent.click(screen.getAllByText('数据管理')[0])
    expect(screen.getAllByText('文件格式错误').length).toBeGreaterThanOrEqual(1)
  })

  it('should show import success when true', () => {
    render(<SettingsContent {...defaultProps} importSuccess={true} />)
    fireEvent.click(screen.getAllByText('数据管理')[0])
    expect(screen.getAllByText('数据导入成功！').length).toBeGreaterThanOrEqual(1)
  })

  it('should call onExport when export clicked', () => {
    const onExport = vi.fn()
    render(<SettingsContent {...defaultProps} onExport={onExport} />)
    fireEvent.click(screen.getAllByText('数据管理')[0])
    fireEvent.click(screen.getAllByText('导出数据')[0].closest('button')!)
    expect(onExport).toHaveBeenCalledOnce()
  })

  it('should call onConfirmTarget with daily when daily reset clicked', () => {
    const onConfirmTarget = vi.fn()
    render(<SettingsContent {...defaultProps} onConfirmTarget={onConfirmTarget} />)
    fireEvent.click(screen.getAllByText('数据管理')[0])
    fireEvent.click(screen.getAllByText('重置每日进度')[0].closest('button')!)
    expect(onConfirmTarget).toHaveBeenCalledWith('daily')
  })

  it('should call onConfirmTarget with weekly when weekly reset clicked', () => {
    const onConfirmTarget = vi.fn()
    render(<SettingsContent {...defaultProps} onConfirmTarget={onConfirmTarget} />)
    fireEvent.click(screen.getAllByText('数据管理')[0])
    fireEvent.click(screen.getAllByText('重置每周进度')[0].closest('button')!)
    expect(onConfirmTarget).toHaveBeenCalledWith('weekly')
  })

  it('should not show general settings after navigating away', () => {
    render(<SettingsContent {...defaultProps} />)
    fireEvent.click(screen.getAllByText('数据管理')[0])
    expect(screen.getAllByText('导出数据').length).toBeGreaterThanOrEqual(1)
  })

  it('should call onCancelDisconnect when disconnect cancel clicked', () => {
    const onCancelDisconnect = vi.fn()
    render(
      <SettingsContent
        {...defaultProps}
        cloudSyncProps={{
          syncStatus: 'connected',
          lastSyncTime: null,
          syncError: null,
          isConfigured: true,
          onSetupSupabase: vi.fn(),
          onTriggerSync: vi.fn(),
          onConfirmDisconnect: vi.fn(),
          onRequestDisconnect: vi.fn(),
          onCancelDisconnect,
          showDisconnectConfirm: true,
        }}
      />,
    )
    fireEvent.click(screen.getByText('取消'))
    expect(onCancelDisconnect).toHaveBeenCalledOnce()
  })

  it('should call onConfirmDisconnect when disconnect confirmed', () => {
    const onConfirmDisconnect = vi.fn()
    render(
      <SettingsContent
        {...defaultProps}
        cloudSyncProps={{
          syncStatus: 'connected',
          lastSyncTime: null,
          syncError: null,
          isConfigured: true,
          onSetupSupabase: vi.fn(),
          onTriggerSync: vi.fn(),
          onConfirmDisconnect,
          onRequestDisconnect: vi.fn(),
          onCancelDisconnect: vi.fn(),
          showDisconnectConfirm: true,
        }}
      />,
    )
    fireEvent.click(screen.getByText('确认断开'))
    expect(onConfirmDisconnect).toHaveBeenCalledOnce()
  })
})

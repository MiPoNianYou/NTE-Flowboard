import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { SettingsData } from '../../../components/settings/SettingsData'

describe('SettingsData', () => {
  const mockDataProps = {
    onManualReset: vi.fn(),
    onExport: vi.fn(),
    onImportFile: vi.fn(),
    fileInputRef: { current: null },
    isImportError: false,
    isImportSuccess: false,
    isExportSuccess: false,
  }

  it('should render data management buttons', () => {
    render(<SettingsData {...mockDataProps} isEmbedded />)
    expect(screen.getByText('重置每日进度')).toBeInTheDocument()
    expect(screen.getByText('重置每周进度')).toBeInTheDocument()
    expect(screen.getByText('重置每月进度')).toBeInTheDocument()
    expect(screen.getByText('导出数据')).toBeInTheDocument()
    expect(screen.getByText('导入数据')).toBeInTheDocument()
  })

  it('should enter confirm state after first click, then call onManualReset on second click', () => {
    render(<SettingsData {...mockDataProps} isEmbedded />)
    const dailyButton = screen.getByText('重置每日进度').closest('button')!
    fireEvent.click(dailyButton)
    expect(screen.getByText('确认清除所有每日任务的完成状态？')).toBeInTheDocument()
    const confirmButton = screen.getByText('确认清除所有每日任务的完成状态？').closest('button')!
    fireEvent.click(confirmButton)
    expect(mockDataProps.onManualReset).toHaveBeenCalledWith('daily')
  })

  it('should call onExport when export clicked', () => {
    render(<SettingsData {...mockDataProps} isEmbedded />)
    fireEvent.click(screen.getByText('导出数据').closest('button')!)
    expect(mockDataProps.onExport).toHaveBeenCalledOnce()
  })

  it('should show import error state when importError is set', () => {
    render(<SettingsData {...mockDataProps} isImportError={true} isEmbedded />)
    expect(screen.getByText('文件错误')).toBeInTheDocument()
  })

  it('should show import success state when isImportSuccess is true', () => {
    render(<SettingsData {...mockDataProps} isImportSuccess={true} isEmbedded />)
    expect(screen.getByText('导入成功')).toBeInTheDocument()
  })
})

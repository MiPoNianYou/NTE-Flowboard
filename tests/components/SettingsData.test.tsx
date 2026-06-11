import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, useRef } from 'vitest'
import { SettingsData } from '../../src/components/SettingsData'

vi.mock('motion/react')

describe('SettingsData', () => {
  const defaultProps = {
    onConfirmTarget: vi.fn(),
    onExport: vi.fn(),
    onImportFile: vi.fn(),
    fileInputRef: { current: null },
    importError: '',
    importSuccess: false,
  }

  it('should render data management buttons', () => {
    render(<SettingsData {...defaultProps} embedded />)
    expect(screen.getByText('重置每日进度')).toBeInTheDocument()
    expect(screen.getByText('重置每周进度')).toBeInTheDocument()
    expect(screen.getByText('导出数据')).toBeInTheDocument()
    expect(screen.getByText('导入数据')).toBeInTheDocument()
  })

  it('should call onConfirmTarget with daily when daily reset clicked', () => {
    render(<SettingsData {...defaultProps} embedded />)
    fireEvent.click(screen.getByText('重置每日进度').closest('button')!)
    expect(defaultProps.onConfirmTarget).toHaveBeenCalledWith('daily')
  })

  it('should call onConfirmTarget with weekly when weekly reset clicked', () => {
    render(<SettingsData {...defaultProps} embedded />)
    fireEvent.click(screen.getByText('重置每周进度').closest('button')!)
    expect(defaultProps.onConfirmTarget).toHaveBeenCalledWith('weekly')
  })

  it('should call onExport when export clicked', () => {
    render(<SettingsData {...defaultProps} embedded />)
    fireEvent.click(screen.getByText('导出数据').closest('button')!)
    expect(defaultProps.onExport).toHaveBeenCalledOnce()
  })

  it('should show import error when provided', () => {
    render(<SettingsData {...defaultProps} importError="文件格式错误" embedded />)
    expect(screen.getByText('文件格式错误')).toBeInTheDocument()
  })

  it('should show import success when true', () => {
    render(<SettingsData {...defaultProps} importSuccess={true} embedded />)
    expect(screen.getByText('数据导入成功！')).toBeInTheDocument()
  })

  it('should render info callout', () => {
    render(<SettingsData {...defaultProps} embedded />)
    expect(screen.getByText('导出的 JSON 文件包含你的所有数据')).toBeInTheDocument()
  })
})

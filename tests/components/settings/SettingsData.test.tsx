import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { beforeEach, describe, it, expect, vi } from 'vitest'
import { SettingsData } from '../../../src/components/settings/SettingsData'

describe('SettingsData', () => {
  const mockDataProps = {
    onManualReset: vi.fn(),
    restoreDefaultsControls: {
      onRestoreDefaults: vi.fn(async () => 'success' as const),
      onUndoRestoreDefaults: vi.fn(async () => 'success' as const),
      hasRestoreBackup: false,
      hasChangesSinceRestore: false,
    },
    isCloudConfigured: false,
    onExport: vi.fn(),
    onImportFile: vi.fn(),
    fileInputRef: { current: null },
    isImportError: false,
    isImportSuccess: false,
    isExportSuccess: false,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render data management buttons', () => {
    render(<SettingsData {...mockDataProps} isEmbedded />)
    expect(screen.getByText('重置每日进度')).toBeInTheDocument()
    expect(screen.getByText('重置每周进度')).toBeInTheDocument()
    expect(screen.getByText('重置每月进度')).toBeInTheDocument()
    const restoreHeader = screen.getByRole('button', { name: '恢复默认清单' })
    expect(restoreHeader).toHaveAttribute('aria-expanded', 'false')
    expect(screen.getByText('导出数据')).toBeInTheDocument()
    expect(screen.getByText('导入数据')).toBeInTheDocument()

    const resetButton = screen.getByText('重置每日进度').closest('button')!
    const importButton = screen.getByText('导入数据').closest('button')!
    const restoreButton = document.querySelector<HTMLButtonElement>(
      '[data-restore-defaults-action]',
    )!
    expect(restoreButton.closest('[data-hover-scale-card]')).not.toBe(
      importButton.closest('[data-hover-scale-card]'),
    )
    expect(restoreButton.closest('[data-hover-scale-card]')).not.toBe(
      resetButton.closest('[data-hover-scale-card]'),
    )
    expect(
      Boolean(
        importButton.compareDocumentPosition(restoreButton) & Node.DOCUMENT_POSITION_FOLLOWING,
      ),
    ).toBe(true)
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

  it('should forward the selected import file', () => {
    const onImportFile = vi.fn()
    const { container } = render(
      <SettingsData {...mockDataProps} onImportFile={onImportFile} isEmbedded />,
    )
    const file = new File(['{}'], 'checklist.json', { type: 'application/json' })
    const input = container.querySelector<HTMLInputElement>('input[type="file"]')!

    fireEvent.change(input, { target: { files: [file] } })

    expect(onImportFile).toHaveBeenCalledOnce()
    expect(input.files?.[0]).toBe(file)
  })

  it('should restore default lists only after the second click', async () => {
    render(<SettingsData {...mockDataProps} isEmbedded />)

    fireEvent.click(screen.getByRole('button', { name: '恢复默认清单' }))
    const restoreButton = document.querySelector<HTMLButtonElement>(
      '[data-restore-defaults-action]',
    )!
    expect(restoreButton).toHaveClass('bg-danger/10')

    fireEvent.click(restoreButton)
    const confirmButton = screen.getByText('确认恢复所有默认清单？').closest('button')!
    expect(confirmButton).toHaveClass('bg-danger')
    expect(confirmButton).not.toHaveClass('bg-danger/10')
    expect(confirmButton).toHaveAttribute('data-restore-defaults-confirming', 'true')
    expect(mockDataProps.restoreDefaultsControls.onRestoreDefaults).not.toHaveBeenCalled()

    fireEvent.click(confirmButton)
    expect(mockDataProps.restoreDefaultsControls.onRestoreDefaults).toHaveBeenCalledOnce()
    expect(await screen.findByText('默认清单已恢复')).toBeInTheDocument()
  })

  it('should abort the restore and show an error when backup creation fails', async () => {
    const onRestoreDefaults = vi.fn(async () => 'backup-failed' as const)
    render(
      <SettingsData
        {...mockDataProps}
        restoreDefaultsControls={{
          ...mockDataProps.restoreDefaultsControls,
          onRestoreDefaults,
        }}
        isEmbedded
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: '恢复默认清单' }))
    const restoreButton = document.querySelector<HTMLButtonElement>(
      '[data-restore-defaults-action]',
    )!
    fireEvent.click(restoreButton)
    fireEvent.click(screen.getByText('确认恢复所有默认清单？').closest('button')!)

    expect(onRestoreDefaults).toHaveBeenCalledOnce()
    expect(await screen.findByText('无法创建备份，未恢复默认清单。')).toBeInTheDocument()
    expect(screen.queryByText('默认清单已恢复')).not.toBeInTheDocument()
  })

  it('should report a restore persistence failure while keeping the recovery flow available', async () => {
    const onRestoreDefaults = vi.fn(async () => 'persistence-failed' as const)
    render(
      <SettingsData
        {...mockDataProps}
        restoreDefaultsControls={{
          ...mockDataProps.restoreDefaultsControls,
          onRestoreDefaults,
        }}
        isEmbedded
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: '恢复默认清单' }))
    fireEvent.click(document.querySelector<HTMLButtonElement>('[data-restore-defaults-action]')!)
    fireEvent.click(screen.getByText('确认恢复所有默认清单？').closest('button')!)

    expect(
      await screen.findByText('恢复结果未能安全保存，撤销备份已保留。请重试。'),
    ).toBeInTheDocument()
    expect(document.querySelector('[data-restore-defaults-action]')).toBeInTheDocument()
  })

  it('should show the cloud overwrite warning only when cloud sync is configured', () => {
    const { rerender } = render(<SettingsData {...mockDataProps} isEmbedded />)
    expect(screen.queryByText('云端数据也会被覆盖，并同步到其他设备。')).not.toBeInTheDocument()

    rerender(<SettingsData {...mockDataProps} isCloudConfigured isEmbedded />)
    expect(screen.getByText(/云端数据也会被覆盖/)).toBeInTheDocument()
  })

  it('should undo immediately when the checklist has not changed since restore', async () => {
    render(
      <SettingsData
        {...mockDataProps}
        restoreDefaultsControls={{
          ...mockDataProps.restoreDefaultsControls,
          hasRestoreBackup: true,
        }}
        isEmbedded
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: '恢复默认清单' }))
    fireEvent.click(document.querySelector<HTMLButtonElement>('[data-undo-restore-action]')!)

    await waitFor(() =>
      expect(mockDataProps.restoreDefaultsControls.onUndoRestoreDefaults).toHaveBeenCalledOnce(),
    )
  })

  it('should require confirmation before undoing over newer checklist changes', async () => {
    render(
      <SettingsData
        {...mockDataProps}
        restoreDefaultsControls={{
          ...mockDataProps.restoreDefaultsControls,
          hasRestoreBackup: true,
          hasChangesSinceRestore: true,
        }}
        isEmbedded
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: '恢复默认清单' }))
    const undoButton = document.querySelector<HTMLButtonElement>('[data-undo-restore-action]')!
    fireEvent.click(undoButton)

    expect(screen.getByText('确认覆盖恢复后的新改动？')).toBeInTheDocument()
    expect(mockDataProps.restoreDefaultsControls.onUndoRestoreDefaults).not.toHaveBeenCalled()

    fireEvent.click(screen.getByText('确认覆盖恢复后的新改动？').closest('button')!)
    await waitFor(() =>
      expect(mockDataProps.restoreDefaultsControls.onUndoRestoreDefaults).toHaveBeenCalledOnce(),
    )
  })

  it('should report an undo persistence failure without hiding the undo action', async () => {
    const onUndoRestoreDefaults = vi.fn(async () => 'persistence-failed' as const)
    render(
      <SettingsData
        {...mockDataProps}
        restoreDefaultsControls={{
          ...mockDataProps.restoreDefaultsControls,
          onUndoRestoreDefaults,
          hasRestoreBackup: true,
        }}
        isEmbedded
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: '恢复默认清单' }))
    fireEvent.click(document.querySelector<HTMLButtonElement>('[data-undo-restore-action]')!)

    expect(
      await screen.findByText('撤销结果未能安全保存，备份已保留。请重试。'),
    ).toBeInTheDocument()
    expect(document.querySelector('[data-undo-restore-action]')).toBeInTheDocument()
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

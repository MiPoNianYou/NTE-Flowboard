import { type ChangeEvent, type RefObject } from 'react'
import { Download, Upload, RotateCcw, Info } from 'lucide-react'
import type { TabType } from '../types'
import { SettingsPage } from './SettingsPage'
import { Button } from './base/Button'
import { StatusMessage } from './base/StatusMessage'

interface SettingsDataProps {
  onConfirmTarget: (tab: TabType | null) => void
  onExport: () => void
  onImportFile: (e: ChangeEvent<HTMLInputElement>) => void
  fileInputRef: RefObject<HTMLInputElement | null>
  importError: string
  importSuccess: boolean
  onBack?: () => void
  embedded?: boolean
}

export function SettingsData({
  onConfirmTarget,
  onExport,
  onImportFile,
  fileInputRef,
  importError,
  importSuccess,
  onBack,
  embedded,
}: SettingsDataProps) {
  return (
    <SettingsPage title="数据管理" onBack={onBack} embedded={embedded}>
      <div className="p-5 space-y-4">
        <div className="bg-surface rounded-lg border border-border p-4 space-y-2">
            <Button
              variant="warning-soft"
              onClick={() => onConfirmTarget('daily')}
              className="w-full justify-start"
            >
              <RotateCcw className="size-4" />
              <div className="text-left">
                <p>重置每日进度</p>
                <p className="text-xs font-normal opacity-70">清除所有每日任务的完成状态</p>
              </div>
            </Button>
            <Button
              variant="warning-soft"
              onClick={() => onConfirmTarget('weekly')}
              className="w-full justify-start"
            >
              <RotateCcw className="size-4" />
              <div className="text-left">
                <p>重置每周进度</p>
                <p className="text-xs font-normal opacity-70">清除所有每周任务的完成状态</p>
              </div>
            </Button>
          </div>

        <div className="bg-surface rounded-lg border border-border p-4 space-y-2">
          <Button
            variant="success-soft"
            onClick={onExport}
            className="w-full justify-start"
          >
            <Download className="size-4" />
            <div className="text-left">
              <p>导出数据</p>
              <p className="text-xs font-normal opacity-70">下载 JSON 文件备份当前数据</p>
            </div>
          </Button>

          <Button
            variant="info-soft"
            onClick={() => fileInputRef.current?.click()}
            className="w-full justify-start"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={onImportFile}
              className="hidden"
            />
            <Upload className="size-4" />
            <div className="text-left">
              <p>导入数据</p>
              <p className="text-xs font-normal opacity-70">从 JSON 文件恢复数据</p>
            </div>
          </Button>

          {importError && (
            <StatusMessage tone="danger" mode="banner">{importError}</StatusMessage>
          )}
          {importSuccess && (
            <StatusMessage tone="success" mode="banner">数据导入成功！</StatusMessage>
          )}

          <StatusMessage tone="info" mode="callout" icon={<Info className="size-4" />}>
            <p>导出的 JSON 文件包含你的清单数据和服务器设置</p>
            <p>导入时会覆盖当前数据</p>
          </StatusMessage>
        </div>
      </div>
    </SettingsPage>
  )
}

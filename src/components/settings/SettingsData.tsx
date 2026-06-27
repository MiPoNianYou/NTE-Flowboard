import { type ChangeEvent, type RefObject, useState, useRef, useCallback, useEffect } from 'react'
import { Download, Upload, RotateCcw, CircleX, CircleCheck } from 'lucide-react'
import type { TabType } from '../../types'
import type { SettingsPageBaseProps } from './SettingsPage'
import { SettingsPage } from './SettingsPage'
import { Card } from '../base/Card'
import { Button } from '../base/Button'
import { MS } from '../../utils/constants'

interface SettingsDataProps extends SettingsPageBaseProps {
  onManualReset: (tab: TabType) => void
  onExport: () => void
  onImportFile: (event: ChangeEvent<HTMLInputElement>) => void
  fileInputRef: RefObject<HTMLInputElement | null>
  isImportError: boolean
  isImportSuccess: boolean
  isExportSuccess: boolean
}

function useTimedStateSet<T extends string>(timeout: number) {
  const [items, setItems] = useState<Set<T>>(new Set())
  const ref = useRef<Set<T>>(new Set())
  const timersRef = useRef<Record<string, ReturnType<typeof setTimeout> | undefined>>({})

  const add = useCallback(
    (key: T) => {
      clearTimeout(timersRef.current[key])
      ref.current.add(key)
      setItems(new Set(ref.current))
      timersRef.current[key] = setTimeout(() => {
        ref.current.delete(key)
        setItems(new Set(ref.current))
      }, timeout)
    },
    [timeout],
  )

  const remove = useCallback((key: T) => {
    clearTimeout(timersRef.current[key])
    timersRef.current[key] = undefined
    ref.current.delete(key)
    setItems(new Set(ref.current))
  }, [])

  const has = useCallback((key: T) => ref.current.has(key), [])

  useEffect(() => {
    const timers = timersRef.current
    return () => {
      Object.values(timers).forEach(clearTimeout)
    }
  }, [])

  return { items, add, remove, has }
}

const RESET_LABELS: Record<TabType, { default: string; confirm: string; success: string }> = {
  daily: {
    default: '重置每日进度',
    confirm: '确认清除所有每日任务的完成状态？',
    success: '每日进度已重置',
  },
  weekly: {
    default: '重置每周进度',
    confirm: '确认清除所有每周任务的完成状态？',
    success: '每周进度已重置',
  },
  monthly: {
    default: '重置每月进度',
    confirm: '确认清除所有每月任务的完成状态？',
    success: '每月进度已重置',
  },
}

export function SettingsData({
  onManualReset,
  onExport,
  onImportFile,
  fileInputRef,
  isImportError,
  isImportSuccess,
  isExportSuccess,
  onBack,
  isEmbedded,
}: SettingsDataProps) {
  const confirming = useTimedStateSet<TabType>(3000)
  const resetDone = useTimedStateSet<TabType>(MS.SUCCESS_HINT)

  const handleResetClick = useCallback(
    (target: TabType) => {
      if (resetDone.has(target)) return
      if (confirming.has(target)) {
        confirming.remove(target)
        onManualReset(target)
        resetDone.add(target)
      } else {
        confirming.add(target)
      }
    },
    [confirming, resetDone, onManualReset],
  )

  return (
    <SettingsPage title="数据管理" onBack={onBack} isEmbedded={isEmbedded}>
      <div className="space-y-4">
        <Card variant="surface" className="px-4 py-3 space-y-3">
          {(['daily', 'weekly', 'monthly'] as TabType[]).map((tab) => {
            const isResetDone = resetDone.items.has(tab)
            const isConfirming = confirming.items.has(tab)
            return (
              <Button
                key={tab}
                variant={
                  isResetDone ? 'success-soft' : isConfirming ? 'danger-soft' : 'warning-soft'
                }
                onClick={() => handleResetClick(tab)}
                className="w-full justify-start py-4"
              >
                <RotateCcw className="size-4" />
                <div className="text-left">
                  <p>
                    {isResetDone
                      ? RESET_LABELS[tab].success
                      : isConfirming
                        ? RESET_LABELS[tab].confirm
                        : RESET_LABELS[tab].default}
                  </p>
                </div>
              </Button>
            )
          })}
        </Card>
        <Card variant="surface" className="px-4 py-3 space-y-3">
          {isExportSuccess ? (
            <Button
              variant="success-soft"
              onClick={() => {
                return
              }}
              className="w-full justify-start"
            >
              <CircleCheck className="size-4" />
              <div className="text-left">
                <p>导出成功</p>
                <p className="text-xs font-normal opacity-70">数据已成功导出</p>
              </div>
            </Button>
          ) : (
            <Button variant="info-soft" onClick={onExport} className="w-full justify-start">
              <Download className="size-4" />
              <div className="text-left">
                <p>导出数据</p>
                <p className="text-xs font-normal opacity-70">下载 JSON 文件备份当前数据</p>
              </div>
            </Button>
          )}
          {isImportSuccess ? (
            <Button
              variant="success-soft"
              onClick={() => {
                return
              }}
              className="w-full justify-start"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={onImportFile}
                className="hidden"
              />
              <CircleCheck className="size-4" />
              <div className="text-left">
                <p>导入成功</p>
                <p className="text-xs font-normal opacity-70">数据已成功导入</p>
              </div>
            </Button>
          ) : isImportError ? (
            <Button
              variant="danger-soft"
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
              <CircleX className="size-4" />
              <div className="text-left">
                <p>文件错误</p>
                <p className="text-xs font-normal opacity-70">请选择正确文件</p>
              </div>
            </Button>
          ) : (
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
                <p className="text-xs font-normal opacity-70">上传 JSON 文件恢复备份数据</p>
              </div>
            </Button>
          )}
        </Card>
      </div>
    </SettingsPage>
  )
}

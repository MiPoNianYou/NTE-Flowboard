import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Settings, X } from 'lucide-react'
import type { ChecklistData, TabType, ResetConfig } from '../types'
import { exportData, importData } from '../utils/storage'
import { SettingsContent } from './SettingsContent'
import type { CloudSyncProps } from './SettingsContent'

interface Props {
  data: ChecklistData
  autoMoveCompleted: boolean
  onAutoMoveCompletedChange: (newVal: boolean) => void
  onManualReset: (tab: TabType) => void
  onImport: (data: ChecklistData) => void
  onResetConfigChange: (config: ResetConfig) => void

  cloudSyncProps?: Omit<
    CloudSyncProps,
    'onRequestDisconnect' | 'onCancelDisconnect' | 'showDisconnectConfirm'
  >
}

export function SettingsPanel({
  data,
  autoMoveCompleted,
  onAutoMoveCompletedChange,
  onManualReset,
  onImport,
  onResetConfigChange,
  cloudSyncProps: rawCloudSyncProps,
}: Props) {
  const [open, setOpen] = useState(false)
  const [importError, setImportError] = useState('')
  const [importSuccess, setImportSuccess] = useState(false)
  const [confirmTarget, setConfirmTarget] = useState<TabType | null>(null)
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleOpen = () => setOpen(true)

  const handleClose = useCallback(() => {
    setConfirmTarget(null)
    setShowDisconnectConfirm(false)
    setOpen(false)
  }, [])

  const handleOverlayOrClose = useCallback(() => {
    if (confirmTarget) {
      setConfirmTarget(null)
    } else if (showDisconnectConfirm) {
      setShowDisconnectConfirm(false)
    } else {
      handleClose()
    }
  }, [confirmTarget, showDisconnectConfirm, handleClose])

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (confirmTarget) setConfirmTarget(null)
        else if (showDisconnectConfirm) setShowDisconnectConfirm(false)
        else handleClose()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, confirmTarget, showDisconnectConfirm, handleClose])

  // 锁定 body 滚动
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  const handleConfirmReset = () => {
    if (confirmTarget) {
      onManualReset(confirmTarget)
      setConfirmTarget(null)
    }
  }

  const handleExport = () => {
    const json = exportData(data)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'NTE_Flowboard.json'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImportError('')
    setImportSuccess(false)

    const MAX_FILE_SIZE = 1024 * 1024 // 1MB
    if (file.size > MAX_FILE_SIZE) {
      setImportError('文件过大，请选择小于 1MB 的文件')
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      const parsed = importData(text)
      if (parsed) {
        onImport(parsed)
        setImportSuccess(true)
        setTimeout(() => setImportSuccess(false), 2000)
      } else {
        setImportError('无效的数据文件')
      }
    }
    reader.readAsText(file)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const cloudSyncProps = useMemo(
    () =>
      rawCloudSyncProps
        ? {
            ...rawCloudSyncProps,
            showDisconnectConfirm,
            onRequestDisconnect: () => setShowDisconnectConfirm(true),
            onCancelDisconnect: () => setShowDisconnectConfirm(false),
            onConfirmDisconnect: () => {
              rawCloudSyncProps.onConfirmDisconnect()
              setShowDisconnectConfirm(false)
            },
          }
        : undefined,
    [rawCloudSyncProps, showDisconnectConfirm],
  )

  const hasOverlay = !!(confirmTarget || showDisconnectConfirm)

  const sharedContentProps = useMemo(
    () => ({
      confirmTarget,
      onConfirmTarget: setConfirmTarget,
      onConfirmReset: handleConfirmReset,
      onExport: handleExport,
      onImportFile: handleImportFile,

      fileInputRef,
      importError,
      importSuccess,
      cloudSyncProps,
      autoMoveCompleted,
      onAutoMoveCompletedChange,
      resetConfig: data.resetConfig,
      onResetConfigChange,
    }),
    [
      confirmTarget,
      handleConfirmReset,
      handleExport,
      handleImportFile,
      importError,
      importSuccess,
      cloudSyncProps,
      autoMoveCompleted,
      onAutoMoveCompletedChange,
      data.resetConfig,
      onResetConfigChange,
    ],
  )

  return (
    <>
      {/* 设置按钮 */}
      <button
        onClick={handleOpen}
        className="p-2 lg:p-2 rounded-xl text-gray-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors active:scale-[0.97]"
        aria-label="打开设置"
      >
        <Settings className="size-[20px] lg:size-[22px]" />
      </button>

      {/* 移动端：底部 Sheet / 桌面端：居中弹窗 */}
      <AnimatePresence>
        {open && (
          <>
            {/* 遮罩 */}
            <motion.div
              key="settings-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
              onClick={handleOverlayOrClose}
            />

            {/* 移动端：底部 Sheet */}
            <motion.div
              key="settings-sheet-mobile"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 400, damping: 40 }}
              className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/90 dark:bg-gray-900/95 backdrop-blur-xl rounded-t-2xl shadow-elevated max-h-[85vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-label="设置"
            >
              {/* 拖拽条 */}
              <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
                <div className="w-9 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
              </div>

              {/* Header */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200/60 dark:border-white/10 flex-shrink-0">
                <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                  <Settings className="size-[18px] text-indigo-500" />
                  {hasOverlay ? (confirmTarget ? '确认重置' : '断开同步') : '设置'}
                </h2>
                <button
                  onClick={handleOverlayOrClose}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100/60 dark:hover:bg-white/10 transition-colors active:scale-[0.97]"
                >
                  <X className="size-[18px]" />
                </button>
              </div>

              <SettingsContent {...sharedContentProps} />
            </motion.div>

            {/* 桌面端：居中弹窗 */}
            <div className="hidden md:flex fixed inset-0 z-50 items-center justify-center p-4 pointer-events-none">
              <motion.div
                key="settings-dialog"
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                className="relative bg-white/90 dark:bg-gray-900/95 backdrop-blur-xl border border-white/20 dark:border-white/10 shadow-elevated rounded-2xl w-full max-w-md max-h-[85vh] flex flex-col pointer-events-auto"
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-label="设置"
              >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200/60 dark:border-white/10 flex-shrink-0">
                  <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                    <Settings className="size-[18px] text-indigo-500" />
                    {hasOverlay ? (confirmTarget ? '确认重置' : '断开同步') : '设置'}
                  </h2>
                  <button
                    onClick={handleOverlayOrClose}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100/60 dark:hover:bg-white/10 transition-colors active:scale-[0.97]"
                  >
                    <X className="size-[18px]" />
                  </button>
                </div>

                <SettingsContent {...sharedContentProps} />
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}

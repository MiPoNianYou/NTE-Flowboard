import { useState, useRef, useEffect, useCallback, useMemo, type ChangeEvent } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Settings, X } from 'lucide-react'
import type { ChecklistData, TabType, ResetConfig, CloudSyncBaseProps, SettingsProps } from '../types'
import { exportData, importData } from '../utils/storage'
import { SettingsContent } from './SettingsContent'
import { MS } from '../utils/constants'
import { Button } from './base/Button'

interface SettingsPanelProps {
  data: ChecklistData
  onManualReset: (tab: TabType) => void
  onImport: (data: ChecklistData) => void
  onResetConfigChange: (config: ResetConfig) => void
  settings: SettingsProps
  cloudSyncProps?: CloudSyncBaseProps
}

export function SettingsPanel({
  data,
  onManualReset,
  onImport,
  onResetConfigChange,
  settings,
  cloudSyncProps: rawCloudSyncProps,
}: SettingsPanelProps) {
  const {
    autoMoveCompleted, onAutoMoveCompletedChange,
    confirmDelete, onConfirmDeleteChange,
    cloudSyncBehavior, onCloudSyncBehaviorChange,
    showCustomTab, onShowCustomTabChange,
  } = settings
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

  const handleConfirmReset = useCallback(() => {
    if (confirmTarget) {
      onManualReset(confirmTarget)
      setConfirmTarget(null)
    }
  }, [confirmTarget, onManualReset])

  const handleExport = useCallback(() => {
    const settings = { autoMoveCompleted, confirmDelete, showCustomTab }
    const json = exportData(data, true, settings)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'NTE_Flowboard.json'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [data, autoMoveCompleted, confirmDelete, showCustomTab])

  const handleImportFile = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return
      setImportError('')
      setImportSuccess(false)

      const MAX_FILE_SIZE = 1024 * 1024
      if (file.size > MAX_FILE_SIZE) {
        setImportError('文件过大，请选择小于 1MB 的文件')
        if (fileInputRef.current) fileInputRef.current.value = ''
        return
      }

      const reader = new FileReader()
      reader.onload = (ev) => {
        const text = ev.target?.result as string
        const result = importData(text)
        if (result) {
          onImport(result.data)
          if (result.settings) {
            onAutoMoveCompletedChange(result.settings.autoMoveCompleted)
            onConfirmDeleteChange(result.settings.confirmDelete)
          }
          setImportSuccess(true)
          setTimeout(() => setImportSuccess(false), MS.SUCCESS_HINT)
        } else {
          setImportError('无效的数据文件')
        }
      }
      reader.readAsText(file)
      if (fileInputRef.current) fileInputRef.current.value = ''
    },
    [onImport, onAutoMoveCompletedChange, onConfirmDeleteChange],
  )

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

  const confirmProps = useMemo(() => ({
    confirmTarget,
    onConfirmTarget: setConfirmTarget,
    onConfirmReset: handleConfirmReset,
  }), [confirmTarget, handleConfirmReset])

  const importExportProps = useMemo(() => ({
    onExport: handleExport,
    onImportFile: handleImportFile,
    fileInputRef,
    importError,
    importSuccess,
  }), [handleExport, handleImportFile, importError, importSuccess])

  const settingsValuesProps = useMemo(() => ({
    autoMoveCompleted,
    onAutoMoveCompletedChange,
    confirmDelete,
    onConfirmDeleteChange,
    resetConfig: data.resetConfig,
    onResetConfigChange,
    cloudSyncBehavior,
    onCloudSyncBehaviorChange,
    showCustomTab,
    onShowCustomTabChange,
  }), [autoMoveCompleted, onAutoMoveCompletedChange, confirmDelete, onConfirmDeleteChange, data.resetConfig, onResetConfigChange, cloudSyncBehavior, onCloudSyncBehaviorChange, showCustomTab, onShowCustomTabChange])

  const cloudSyncContentProps = useMemo(() => ({
    cloudSyncProps,
  }), [cloudSyncProps])

  const sharedContentProps = useMemo(
    () => ({
      ...confirmProps,
      ...importExportProps,
      ...settingsValuesProps,
      ...cloudSyncContentProps,
    }),
    [confirmProps, importExportProps, settingsValuesProps, cloudSyncContentProps],
  )

  return (
    <>
      <Button
        variant="tertiary"
        onClick={handleOpen}
        className="p-2 lg:p-2"
        aria-label="打开设置"
      >
        <Settings className="size-[20px] lg:size-[22px]" />
      </Button>

      <AnimatePresence mode="wait">
        {open && (
          <>
            <motion.div
              key="settings-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className="fixed inset-0 z-40 bg-overlay"
              onClick={handleOverlayOrClose}
            />

            {/* 移动端：底部弹窗 */}
            <motion.div
              key="settings-sheet-mobile"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 400, damping: 40 }}
              className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-surface border-t border-border rounded-t-xl flex flex-col"
              style={{ maxHeight: 'min(88dvh, 600px)' }}
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-label="设置"
            >
              <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
                <div className="w-10 h-1 rounded-full bg-border-strong" />
              </div>
              <div className="flex items-center justify-between px-5 py-3 border-b border-border flex-shrink-0">
                <h2 className="text-base font-semibold text-text-primary">
                  {hasOverlay ? (confirmTarget ? '确认重置' : '断开同步') : '设置'}
                </h2>
                <Button
                  variant="tertiary"
                  onClick={handleOverlayOrClose}
                  className="p-1.5"
                >
                  <X className="size-[18px]" />
                </Button>
              </div>
              <SettingsContent {...sharedContentProps} />
            </motion.div>

            {/* 桌面端：对话框 */}
            <div className="hidden md:flex fixed inset-0 z-50 items-center justify-center p-4 pointer-events-none">
              <motion.div
                key="settings-dialog"
                initial={{ scale: 0.92, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.92, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                className="relative bg-surface border border-border rounded-lg w-full max-w-[680px] flex flex-col pointer-events-auto overflow-hidden shadow-lg"
                style={{ height: 'min(85dvh, 640px)' }}
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-label="设置"
              >
                <SettingsContent {...sharedContentProps} />
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}

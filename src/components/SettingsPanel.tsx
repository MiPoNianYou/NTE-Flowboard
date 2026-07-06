import { useState, useRef, useEffect, useCallback, useMemo, type ChangeEvent } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Settings, X, ArrowLeft } from 'lucide-react'
import type { ChecklistData, TabType } from '../types'
import type { CloudSyncProps } from './settings/CloudSyncSection'
import { exportData, importData } from '../utils/serialization'
import { SettingsLayout } from './settings/SettingsLayout'
import { NAV_ITEMS, type SubPage } from './settings/SettingsNav'
import { SPRING, PAGE } from '../utils/motion'
import { Button } from './base/Button'
import { useTimedToggle } from '../hooks/useTimedToggle'
import { useSettings } from '../context/SettingsContext'

interface SettingsPanelProps {
  data: ChecklistData
  onManualReset: (tab: TabType) => void
  onImport: (data: ChecklistData) => void
  cloudSyncProps?: CloudSyncProps
}

export function SettingsPanel({
  data,
  onManualReset,
  onImport,
  cloudSyncProps: rawCloudSyncProps,
}: SettingsPanelProps) {
  const { settings, updateSettings } = useSettings()

  const [isOpen, setIsOpen] = useState(false)
  const { isShown: isImportError, trigger: triggerImportError } = useTimedToggle()
  const { isShown: isImportSuccess, trigger: triggerImportSuccess } = useTimedToggle()
  const { isShown: isExportSuccess, trigger: triggerExportSuccess } = useTimedToggle()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleOpen = () => setIsOpen(true)

  const handleClose = useCallback(() => {
    setIsOpen(false)
  }, [])

  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        handleClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, handleClose])

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  const handleExport = useCallback(() => {
    const settingsData = {
      serverRegion: settings.serverRegion,
      isAutoMoveEnabled: settings.isAutoMoveEnabled,
      shouldConfirmDelete: settings.shouldConfirmDelete,
    }
    const json = exportData(data, true, settingsData)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'NTE_Flowboard.json'
    document.body.appendChild(anchor)
    anchor.click()
    document.body.removeChild(anchor)
    URL.revokeObjectURL(url)
    triggerExportSuccess()
  }, [data, settings, triggerExportSuccess])

  const handleImportFile = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = (progressEvent) => {
        const text = progressEvent.target?.result as string
        const result = importData(text)
        if (result) {
          onImport(result.data)
          if (result.settings) {
            updateSettings(result.settings)
          }
          triggerImportSuccess()
        } else {
          triggerImportError()
        }
      }
      reader.readAsText(file)
      if (fileInputRef.current) fileInputRef.current.value = ''
    },
    [onImport, updateSettings, triggerImportSuccess, triggerImportError],
  )

  const layoutProps = useMemo(
    () => ({
      onManualReset,
      onExport: handleExport,
      onImportFile: handleImportFile,
      fileInputRef,
      isImportError,
      isImportSuccess: isImportSuccess,
      isExportSuccess: isExportSuccess,
      cloudSyncProps: rawCloudSyncProps,
    }),
    [
      onManualReset,
      handleExport,
      handleImportFile,
      isImportError,
      isImportSuccess,
      isExportSuccess,
      rawCloudSyncProps,
    ],
  )

  const renderSettingsHeader = useCallback(
    (activeTab: SubPage | null, setActiveTab: (tab: SubPage | null) => void) =>
      activeTab ? (
        <div className="flex items-center justify-between px-5 py-3 border-b border-border flex-shrink-0">
          <h2 className="text-base font-bold text-text-primary">
            {NAV_ITEMS.find((item) => item.id === activeTab)?.label ?? ''}
          </h2>
          <Button
            variant="tertiary"
            onClick={() => setActiveTab(null)}
            className="p-1.5"
            aria-label="返回设置列表"
          >
            <ArrowLeft className="size-[18px]" />
          </Button>
        </div>
      ) : (
        <div className="flex items-center justify-between px-5 py-3 border-b border-border flex-shrink-0">
          <h2 className="text-base font-bold text-text-primary">设置</h2>
          <Button variant="tertiary" onClick={handleClose} className="p-1.5">
            <X className="size-[18px]" />
          </Button>
        </div>
      ),
    [handleClose],
  )

  return (
    <>
      <Button variant="tertiary" onClick={handleOpen} className="p-2 lg:p-2" aria-label="打开设置">
        <Settings className="size-[20px] lg:size-[22px]" />
      </Button>

      <AnimatePresence mode="wait">
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              key="settings-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={PAGE}
              className="fixed inset-0 z-[200] glass-overlay"
              onClick={handleClose}
            />

            {/* Mobile: Bottom sheet */}
            <motion.div
              key="settings-sheet-mobile"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={SPRING}
              className="md:hidden fixed bottom-0 left-0 right-0 z-[300] glass-strong border-t border-border rounded-t-2xl flex flex-col"
              style={{ height: 'clamp(380px, 50dvh, 560px)' }}
              onClick={(event) => event.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-label="设置"
            >
              <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
                <div className="w-12 h-1.5 rounded-full bg-border-strong/50" />
              </div>
              <SettingsLayout {...layoutProps} renderHeader={renderSettingsHeader} />
            </motion.div>

            {/* Desktop: Centered dialog */}
            <div className="hidden md:flex fixed inset-0 z-[300] items-center justify-center p-4 pointer-events-none">
              <motion.div
                key="settings-dialog"
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                transition={SPRING}
                className="relative glass-strong border border-border rounded-2xl w-full max-w-[680px] flex flex-col pointer-events-auto overflow-hidden shadow-glass"
                style={{ height: 'min(85dvh, 640px)' }}
                onClick={(event) => event.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-label="设置"
              >
                <SettingsLayout {...layoutProps} renderHeader={renderSettingsHeader} />
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}

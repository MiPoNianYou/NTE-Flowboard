import { useState, useRef, useEffect, useCallback, useMemo, type ChangeEvent } from 'react'
import { motion } from 'motion/react'
import { Settings, X, ArrowLeft } from 'lucide-react'
import type { ChecklistData, TabType } from '../types'
import type { CloudSyncProps } from './settings/CloudSyncSection'
import { exportData, importData } from '../utils/serialization'
import { SettingsLayout } from './settings/SettingsLayout'
import { NAV_ITEMS, type SubPage } from './settings/SettingsNav'
import { SPRING } from '../utils/motion'
import { Button } from './base/Button'
import { useTimedToggle } from '../hooks/useTimedToggle'

const SETTINGS_BACKDROP_FILTER_CLOSED = 'blur(0px) saturate(1)'
const SETTINGS_BACKDROP_FILTER_OPEN = 'blur(15px) saturate(1.2)'
const SETTINGS_BACKDROP_COLOR_CLOSED = 'rgba(13, 13, 18, 0)'
const SETTINGS_BACKDROP_COLOR_OPEN = 'rgba(13, 13, 18, 0.8)'
const SETTINGS_CLOSE = { duration: 0.48, ease: [0.42, 0, 0.58, 1] as const }

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
  const [isOpen, setIsOpen] = useState(false)
  const [isDesktopMounted, setIsDesktopMounted] = useState(false)
  const [isMobileMounted, setIsMobileMounted] = useState(false)
  const { isShown: isImportError, trigger: triggerImportError } = useTimedToggle()
  const { isShown: isImportSuccess, trigger: triggerImportSuccess } = useTimedToggle()
  const { isShown: isExportSuccess, trigger: triggerExportSuccess } = useTimedToggle()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleOpen = useCallback(() => {
    setIsDesktopMounted(true)
    setIsMobileMounted(true)
    setIsOpen(true)
  }, [])

  const handleClose = useCallback(() => {
    setIsOpen(false)
  }, [])

  const handleDesktopAnimationComplete = useCallback(() => {
    if (!isOpen) setIsDesktopMounted(false)
  }, [isOpen])

  const handleMobileAnimationComplete = useCallback(() => {
    if (!isOpen) setIsMobileMounted(false)
  }, [isOpen])

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
    const json = exportData(data)
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
  }, [data, triggerExportSuccess])

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
          triggerImportSuccess()
        } else {
          triggerImportError()
        }
      }
      reader.readAsText(file)
      if (fileInputRef.current) fileInputRef.current.value = ''
    },
    [onImport, triggerImportSuccess, triggerImportError],
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

      {isMobileMounted && (
        <>
          <motion.div
            initial={{
              backgroundColor: SETTINGS_BACKDROP_COLOR_CLOSED,
              backdropFilter: SETTINGS_BACKDROP_FILTER_CLOSED,
            }}
            animate={{
              backgroundColor: isOpen
                ? SETTINGS_BACKDROP_COLOR_OPEN
                : SETTINGS_BACKDROP_COLOR_CLOSED,
              backdropFilter: isOpen
                ? SETTINGS_BACKDROP_FILTER_OPEN
                : SETTINGS_BACKDROP_FILTER_CLOSED,
            }}
            transition={isOpen ? SPRING : SETTINGS_CLOSE}
            className={`md:hidden fixed inset-0 z-[200] glass-overlay ${
              isOpen ? 'pointer-events-auto' : 'pointer-events-none'
            }`}
            onClick={handleClose}
          />

          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: isOpen ? 0 : '100%' }}
            transition={isOpen ? SPRING : SETTINGS_CLOSE}
            onAnimationComplete={handleMobileAnimationComplete}
            className={`md:hidden fixed bottom-0 left-0 right-0 z-[300] glass-strong border-t border-border rounded-t-2xl flex flex-col ${
              isOpen ? 'pointer-events-auto' : 'pointer-events-none'
            }`}
            style={{ height: 'clamp(380px, 50dvh, 560px)' }}
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-hidden={!isOpen}
            aria-label="设置"
          >
            <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
              <div className="w-12 h-1.5 rounded-full bg-border-strong/50" />
            </div>
            <SettingsLayout {...layoutProps} renderHeader={renderSettingsHeader} />
          </motion.div>
        </>
      )}

      {isDesktopMounted && (
        <>
          <motion.div
            initial={{
              backgroundColor: SETTINGS_BACKDROP_COLOR_CLOSED,
              backdropFilter: SETTINGS_BACKDROP_FILTER_CLOSED,
            }}
            animate={{
              backgroundColor: isOpen
                ? SETTINGS_BACKDROP_COLOR_OPEN
                : SETTINGS_BACKDROP_COLOR_CLOSED,
              backdropFilter: isOpen
                ? SETTINGS_BACKDROP_FILTER_OPEN
                : SETTINGS_BACKDROP_FILTER_CLOSED,
            }}
            transition={isOpen ? SPRING : SETTINGS_CLOSE}
            className={`hidden md:block fixed inset-0 z-[200] glass-overlay ${
              isOpen ? 'pointer-events-auto' : 'pointer-events-none'
            }`}
            onClick={handleClose}
          />

          <div className="hidden md:flex fixed inset-0 z-[300] items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={isOpen ? { scale: 1, opacity: 1 } : { scale: 0.95, opacity: 0 }}
              transition={isOpen ? SPRING : SETTINGS_CLOSE}
              onAnimationComplete={handleDesktopAnimationComplete}
              className={`relative glass-strong border border-border rounded-2xl w-full max-w-[680px] flex flex-col overflow-hidden shadow-glass ${
                isOpen ? 'pointer-events-auto' : 'pointer-events-none'
              }`}
              style={{ height: 'min(85dvh, 640px)' }}
              onClick={(event) => event.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-hidden={!isOpen}
              aria-label="设置"
            >
              <SettingsLayout {...layoutProps} renderHeader={renderSettingsHeader} />
            </motion.div>
          </div>
        </>
      )}
    </>
  )
}

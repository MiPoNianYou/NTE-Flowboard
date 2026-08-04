import {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
  type ChangeEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { motion, useDragControls, useReducedMotion } from 'motion/react'
import { ChevronLeft, Settings } from 'lucide-react'
import type { ChecklistData, NotificationSettingsProps, TabType } from '../types'
import type { CloudSyncProps } from './settings/CloudSyncSection'
import { exportData, importData } from '../utils/serialization'
import { SettingsLayout, type MobileSettingsHeader } from './settings/SettingsLayout'
import { SPRING } from '../utils/motion'
import { Button } from './base/Button'
import { useTimedToggle } from '../hooks/useTimedToggle'
import { useTranslation } from 'react-i18next'
import type { RestoreDefaultsControls } from '../utils/checklistRestoreBackup'

const SETTINGS_CLOSE = { duration: 0.48, ease: [0.42, 0, 0.58, 1] as const }
const MOBILE_SHEET_HEIGHT = 'min(400px, calc(100dvh - env(safe-area-inset-top) - 12px))'
const SHEET_CLOSE_DISTANCE = 96
const SHEET_CLOSE_VELOCITY = 500
const REDUCED_MOTION = { duration: 0 }

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  ).filter((element) => !element.hasAttribute('hidden') && element.getClientRects().length > 0)
}

interface SettingsPanelProps {
  data: ChecklistData
  onManualReset: (tab: TabType) => void
  restoreDefaultsControls: RestoreDefaultsControls
  onImport: (data: ChecklistData) => void
  cloudSyncProps?: CloudSyncProps
  notificationProps?: NotificationSettingsProps
}

export function SettingsPanel({
  data,
  onManualReset,
  restoreDefaultsControls,
  onImport,
  cloudSyncProps: rawCloudSyncProps,
  notificationProps,
}: SettingsPanelProps) {
  const { t } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const [isDesktopMounted, setIsDesktopMounted] = useState(false)
  const [isMobileMounted, setIsMobileMounted] = useState(false)
  const [settingsSession, setSettingsSession] = useState(0)
  const { isShown: isImportError, trigger: triggerImportError } = useTimedToggle()
  const { isShown: isImportSuccess, trigger: triggerImportSuccess } = useTimedToggle()
  const { isShown: isExportSuccess, trigger: triggerExportSuccess } = useTimedToggle()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const settingsButtonRef = useRef<HTMLButtonElement>(null)
  const mobilePanelRef = useRef<HTMLDivElement>(null)
  const desktopPanelRef = useRef<HTMLDivElement>(null)
  const wasOpenRef = useRef(false)
  const dragControls = useDragControls()
  const shouldReduceMotion = useReducedMotion()

  const getActivePanel = useCallback(() => {
    if (typeof window === 'undefined') return null
    const mobileMedia = window.matchMedia?.('(max-width: 767px)')
    return (mobileMedia ? mobileMedia.matches : window.innerWidth < 768)
      ? mobilePanelRef.current
      : desktopPanelRef.current
  }, [])

  const handleOpen = useCallback(() => {
    setSettingsSession((session) => session + 1)
    setIsDesktopMounted(true)
    setIsMobileMounted(true)
    setIsOpen(true)
  }, [])

  const handleClose = useCallback(() => {
    setIsOpen(false)
  }, [])

  const handleSheetDragStart = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      if ((event.target as HTMLElement).closest('button, input, select, textarea, a')) return
      dragControls.start(event)
    },
    [dragControls],
  )

  const handleDesktopAnimationComplete = useCallback(() => {
    if (!isOpen) setIsDesktopMounted(false)
  }, [isOpen])

  const handleMobileAnimationComplete = useCallback(() => {
    if (!isOpen) setIsMobileMounted(false)
  }, [isOpen])

  useEffect(() => {
    if (isOpen) {
      wasOpenRef.current = true
      const frame = window.requestAnimationFrame(() => {
        getActivePanel()
          ?.querySelector<HTMLElement>('[data-settings-initial-focus], button')
          ?.focus()
      })
      return () => window.cancelAnimationFrame(frame)
    }

    if (wasOpenRef.current) {
      settingsButtonRef.current?.focus()
      wasOpenRef.current = false
    }
  }, [getActivePanel, isOpen])

  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        handleClose()
        return
      }

      if (event.key !== 'Tab') return
      const panel = getActivePanel()
      if (!panel) return
      const focusable = getFocusableElements(panel)
      if (focusable.length === 0) {
        event.preventDefault()
        panel.focus()
        return
      }

      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (
        !event.shiftKey &&
        (document.activeElement === last || !panel.contains(document.activeElement))
      ) {
        event.preventDefault()
        first.focus()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [getActivePanel, handleClose, isOpen])

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
      restoreDefaultsControls,
      onExport: handleExport,
      onImportFile: handleImportFile,
      fileInputRef,
      isImportError,
      isImportSuccess: isImportSuccess,
      isExportSuccess: isExportSuccess,
      cloudSyncProps: rawCloudSyncProps,
      notificationProps,
    }),
    [
      onManualReset,
      restoreDefaultsControls,
      handleExport,
      handleImportFile,
      isImportError,
      isImportSuccess,
      isExportSuccess,
      rawCloudSyncProps,
      notificationProps,
    ],
  )

  const renderSettingsHeader = useCallback(
    ({ title, backLabel, onBack }: MobileSettingsHeader) => {
      return (
        <div
          className="settings-mobile-header grid min-h-14 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center px-3 flex-shrink-0"
          onPointerDown={handleSheetDragStart}
        >
          {onBack && backLabel ? (
            <button
              type="button"
              onClick={onBack}
              className="inline-flex size-10 items-center justify-center justify-self-start rounded-pill bg-elevated text-text-primary shadow-sm transition-[background-color,transform,opacity] duration-150 hover:bg-surface-hover active:scale-95 active:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
              aria-label={t('settings.backTo', { name: backLabel })}
              title={t('settings.backTo', { name: backLabel })}
            >
              <ChevronLeft className="size-5 stroke-[2]" aria-hidden="true" />
            </button>
          ) : (
            <span aria-hidden="true" />
          )}
          <h2 className="min-w-0 truncate px-2 text-center text-base font-bold text-text-primary">
            {title}
          </h2>
          <span aria-hidden="true" />
        </div>
      )
    },
    [handleSheetDragStart, t],
  )

  return (
    <>
      <Button
        ref={settingsButtonRef}
        variant="tertiary"
        onClick={handleOpen}
        className="p-2 lg:p-2"
        aria-label={t('settings.open')}
      >
        <Settings className="size-[20px] lg:size-[22px]" />
      </Button>

      {isMobileMounted && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: isOpen ? 1 : 0 }}
            transition={shouldReduceMotion ? REDUCED_MOTION : isOpen ? SPRING : SETTINGS_CLOSE}
            className={`md:hidden fixed inset-0 z-[200] glass-overlay settings-panel-overlay ${
              isOpen ? 'pointer-events-auto' : 'pointer-events-none'
            }`}
            onClick={handleClose}
          />

          <motion.div
            ref={mobilePanelRef}
            initial={{ y: '100%' }}
            animate={{ y: isOpen ? 0 : '100%' }}
            transition={shouldReduceMotion ? REDUCED_MOTION : isOpen ? SPRING : SETTINGS_CLOSE}
            onAnimationComplete={handleMobileAnimationComplete}
            drag="y"
            dragControls={dragControls}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ bottom: 0.24 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > SHEET_CLOSE_DISTANCE || info.velocity.y > SHEET_CLOSE_VELOCITY) {
                handleClose()
              }
            }}
            className={`settings-mobile-sheet md:hidden fixed bottom-0 left-0 right-0 z-[300] glass-strong rounded-t-panel flex flex-col overflow-hidden transition-none ${
              isOpen ? 'pointer-events-auto' : 'pointer-events-none'
            }`}
            style={{ height: MOBILE_SHEET_HEIGHT }}
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-hidden={!isOpen}
            aria-label={t('settings.title')}
            tabIndex={-1}
          >
            <div
              className="flex justify-center pb-1 pt-3 flex-shrink-0 touch-none"
              onPointerDown={handleSheetDragStart}
            >
              <div className="h-1.5 w-12 rounded-pill bg-border-strong/50" aria-hidden="true" />
            </div>
            <SettingsLayout
              key={`mobile-${settingsSession}`}
              {...layoutProps}
              renderHeader={renderSettingsHeader}
              reduceMotion={Boolean(shouldReduceMotion)}
            />
          </motion.div>
        </>
      )}

      {isDesktopMounted && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: isOpen ? 1 : 0 }}
            transition={shouldReduceMotion ? REDUCED_MOTION : isOpen ? SPRING : SETTINGS_CLOSE}
            className={`hidden md:block fixed inset-0 z-[200] glass-overlay settings-panel-overlay ${
              isOpen ? 'pointer-events-auto' : 'pointer-events-none'
            }`}
            onClick={handleClose}
          />

          <div className="hidden md:flex fixed inset-0 z-[300] items-center justify-center p-4 pointer-events-none">
            <motion.div
              ref={desktopPanelRef}
              initial={{ scale: 0.95, opacity: 0 }}
              animate={isOpen ? { scale: 1, opacity: 1 } : { scale: 0.95, opacity: 0 }}
              transition={shouldReduceMotion ? REDUCED_MOTION : isOpen ? SPRING : SETTINGS_CLOSE}
              onAnimationComplete={handleDesktopAnimationComplete}
              className={`relative glass-strong border border-border rounded-panel w-full max-w-[680px] flex flex-col overflow-hidden shadow-glass ${
                isOpen ? 'pointer-events-auto' : 'pointer-events-none'
              }`}
              style={{ height: 'min(85dvh, 640px)' }}
              onClick={(event) => event.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-hidden={!isOpen}
              aria-label={t('settings.title')}
              tabIndex={-1}
            >
              <SettingsLayout
                key={`desktop-${settingsSession}`}
                {...layoutProps}
                renderHeader={renderSettingsHeader}
                reduceMotion={Boolean(shouldReduceMotion)}
              />
            </motion.div>
          </div>
        </>
      )}
    </>
  )
}

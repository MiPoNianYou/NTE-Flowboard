import {
  useState,
  useMemo,
  useRef,
  useEffect,
  useCallback,
  type ChangeEvent,
  type FocusEvent,
  type RefObject,
  type ReactNode,
} from 'react'
import { motion, AnimatePresence } from 'motion/react'
import type { TabType } from '../../types'
import type { CloudSyncProps } from './CloudSyncSection'
import { SettingsNav, type SubPage } from './SettingsNav'
import { SettingsGeneral } from './SettingsGeneral'
import { SettingsServer } from './SettingsServer'
import { SettingsData } from './SettingsData'
import { CloudSyncSection } from './CloudSyncSection'
import { PAGE } from '../../utils/motion'
import { useSettings } from '../../context/SettingsContext'
import { useTranslation } from 'react-i18next'
import type { RestoreDefaultsControls } from '../../utils/checklistRestoreBackup'

const TAB_ORDER: SubPage[] = ['general', 'server', 'cloud', 'data']
const REDUCED_MOTION = { duration: 0 }
const MOBILE_PAGE_TRANSITION_MS = 260
const MOBILE_PAGE_TRANSITION = {
  duration: MOBILE_PAGE_TRANSITION_MS / 1000,
  ease: [0.42, 0, 0.58, 1] as const,
}
const MOBILE_PARENT_PAGE_OFFSET = '-28%'
const MOBILE_PARENT_CONTENT_MASK = '72%'
const MOBILE_PAGE_CORNER_RADIUS = 16
const MOBILE_KEYBOARD_FIELD_SELECTOR =
  'input:not([type="checkbox"]):not([type="radio"]):not([type="range"]):not([type="file"]):not([type="button"]):not([type="submit"]):not([type="reset"]), textarea, select, [contenteditable="true"]'

type MobileRoute = { kind: 'navigation' } | { kind: 'tab'; tab: SubPage }

export interface MobileSettingsHeader {
  title: string
  backLabel?: string
  onBack?: () => void
}

interface MobilePageSurfaceProps {
  header: MobileSettingsHeader
  renderHeader?: (header: MobileSettingsHeader) => ReactNode
  onFocusCapture: (event: FocusEvent<HTMLDivElement>) => void
  children: ReactNode
}

function MobilePageSurface({
  header,
  renderHeader,
  onFocusCapture,
  children,
}: MobilePageSurfaceProps) {
  return (
    <div className="size-full min-h-0 flex flex-col">
      {renderHeader?.(header)}
      <div
        className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]"
        onFocusCapture={onFocusCapture}
      >
        {children}
      </div>
    </div>
  )
}

function shouldKeepMobileFieldVisible(target: HTMLElement) {
  return target.matches(MOBILE_KEYBOARD_FIELD_SELECTOR)
}

interface SettingsLayoutProps {
  onManualReset: (tab: TabType) => void
  restoreDefaultsControls: RestoreDefaultsControls
  onExport: () => void
  onImportFile: (event: ChangeEvent<HTMLInputElement>) => void
  fileInputRef: RefObject<HTMLInputElement | null>
  isImportError: boolean
  isImportSuccess: boolean
  isExportSuccess: boolean
  cloudSyncProps?: CloudSyncProps
  reduceMotion?: boolean
  renderHeader?: (header: MobileSettingsHeader) => ReactNode
}

function getMobileRouteKey(route: MobileRoute) {
  if (route.kind === 'navigation') return 'navigation'
  return `${route.kind}-${route.tab}`
}

export function SettingsLayout({
  onManualReset,
  restoreDefaultsControls,
  onExport,
  onImportFile,
  fileInputRef,
  isImportError,
  isImportSuccess,
  isExportSuccess,
  cloudSyncProps,
  reduceMotion = false,
  renderHeader,
}: SettingsLayoutProps) {
  const { t } = useTranslation()
  const { settings } = useSettings()
  const [desktopTab, setDesktopTab] = useState<SubPage>('general')
  const [desktopDirection, setDesktopDirection] = useState(1)
  const [mobileRoute, setMobileRoute] = useState<MobileRoute>({ kind: 'navigation' })
  const [mobileDirection, setMobileDirection] = useState<1 | -1>(1)
  const [isMobileTransitioning, setIsMobileTransitioning] = useState(false)
  const suppressDesktopContentInitialRef = useRef(true)

  useEffect(() => {
    suppressDesktopContentInitialRef.current = false
  }, [])

  const keepFocusedFieldVisible = useCallback((event: FocusEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement
    if (!shouldKeepMobileFieldVisible(target)) return
    const container = event.currentTarget

    window.requestAnimationFrame(() => {
      if (!container.contains(target)) return

      const containerBounds = container.getBoundingClientRect()
      const targetBounds = target.getBoundingClientRect()
      const edgePadding = 16
      if (targetBounds.bottom > containerBounds.bottom - edgePadding) {
        container.scrollBy({ top: targetBounds.bottom - containerBounds.bottom + edgePadding })
      } else if (targetBounds.top < containerBounds.top + edgePadding) {
        container.scrollBy({ top: targetBounds.top - containerBounds.top - edgePadding })
      }
    })
  }, [])

  const sidebarLabels = useMemo<Record<SubPage, string | undefined>>(
    () => ({
      general: undefined,
      server: t(`settings.server.${settings.serverRegion}`),
      cloud: cloudSyncProps?.isConfigured
        ? t('settings.status.connected')
        : t('settings.status.notConfigured'),
      data: undefined,
    }),
    [settings.serverRegion, cloudSyncProps?.isConfigured, t],
  )

  const handleDesktopTabChange = useCallback(
    (tab: SubPage) => {
      const oldIndex = TAB_ORDER.indexOf(desktopTab)
      const newIndex = TAB_ORDER.indexOf(tab)
      if (newIndex !== oldIndex) setDesktopDirection(newIndex > oldIndex ? 1 : -1)
      setDesktopTab(tab)
    },
    [desktopTab],
  )

  const navigateMobile = useCallback(
    (route: MobileRoute, direction: 1 | -1) => {
      if (getMobileRouteKey(route) === getMobileRouteKey(mobileRoute)) return
      setIsMobileTransitioning(!reduceMotion)
      setMobileDirection(direction)
      setMobileRoute(route)
    },
    [mobileRoute, reduceMotion],
  )

  const handleMobileExitComplete = useCallback(() => {
    setIsMobileTransitioning(false)
  }, [])

  const handleMobileBack = useCallback(() => {
    if (mobileRoute.kind === 'tab') navigateMobile({ kind: 'navigation' }, -1)
  }, [mobileRoute.kind, navigateMobile])

  const settingsDataProps = useMemo(
    () => ({
      onManualReset,
      restoreDefaultsControls,
      isCloudConfigured: Boolean(cloudSyncProps?.isConfigured),
      onExport,
      onImportFile,
      fileInputRef,
      isImportError,
      isImportSuccess,
      isExportSuccess,
    }),
    [
      cloudSyncProps?.isConfigured,
      fileInputRef,
      isExportSuccess,
      isImportError,
      isImportSuccess,
      onExport,
      onImportFile,
      onManualReset,
      restoreDefaultsControls,
    ],
  )

  const renderDesktopContent = useMemo(() => {
    switch (desktopTab) {
      case 'general':
        return <SettingsGeneral isEmbedded />
      case 'server':
        return <SettingsServer isEmbedded />
      case 'cloud':
        return cloudSyncProps ? (
          <div className="space-y-4">
            <CloudSyncSection {...cloudSyncProps} />
          </div>
        ) : null
      case 'data':
        return <SettingsData {...settingsDataProps} isEmbedded />
    }
  }, [desktopTab, cloudSyncProps, settingsDataProps])

  const renderMobileContent = useMemo(() => {
    if (mobileRoute.kind === 'navigation') {
      return (
        <SettingsNav
          activeTab={null}
          onTabChange={(tab) => navigateMobile({ kind: 'tab', tab }, 1)}
          labels={sidebarLabels}
          showDisclosure
        />
      )
    }

    switch (mobileRoute.tab) {
      case 'general':
        return <SettingsGeneral isEmbedded />
      case 'server':
        return <SettingsServer isEmbedded mobile />
      case 'cloud':
        return cloudSyncProps ? <CloudSyncSection {...cloudSyncProps} mobile /> : null
      case 'data':
        return <SettingsData {...settingsDataProps} isEmbedded mobile />
    }
  }, [mobileRoute, sidebarLabels, navigateMobile, cloudSyncProps, settingsDataProps])

  const mobileHeader = useMemo<MobileSettingsHeader>(() => {
    if (mobileRoute.kind === 'navigation') return { title: t('settings.title') }
    return {
      title: t(`settings.nav.${mobileRoute.tab}`),
      backLabel: t('settings.title'),
      onBack: handleMobileBack,
    }
  }, [handleMobileBack, mobileRoute, t])

  const mobilePageVariants = useMemo(
    () => ({
      enter: (direction: number) => ({
        left: reduceMotion ? 0 : direction > 0 ? '100%' : MOBILE_PARENT_PAGE_OFFSET,
        zIndex: direction > 0 ? 2 : 1,
        clipPath:
          reduceMotion || direction > 0
            ? 'inset(0 0 0 0)'
            : `inset(0 ${MOBILE_PARENT_CONTENT_MASK} 0 0)`,
        borderTopLeftRadius: reduceMotion || direction < 0 ? 0 : MOBILE_PAGE_CORNER_RADIUS,
        borderBottomLeftRadius: reduceMotion || direction < 0 ? 0 : MOBILE_PAGE_CORNER_RADIUS,
      }),
      center: (direction: number) => ({
        left: 0,
        zIndex: direction > 0 ? 2 : 1,
        clipPath: 'inset(0 0 0 0)',
        borderTopLeftRadius: 0,
        borderBottomLeftRadius: 0,
      }),
      exit: (direction: number) => ({
        left: reduceMotion ? 0 : direction > 0 ? MOBILE_PARENT_PAGE_OFFSET : '100%',
        zIndex: direction > 0 ? 1 : 2,
        clipPath:
          reduceMotion || direction < 0
            ? 'inset(0 0 0 0)'
            : `inset(0 ${MOBILE_PARENT_CONTENT_MASK} 0 0)`,
        borderTopLeftRadius: reduceMotion || direction > 0 ? 0 : MOBILE_PAGE_CORNER_RADIUS,
        borderBottomLeftRadius: reduceMotion || direction > 0 ? 0 : MOBILE_PAGE_CORNER_RADIUS,
      }),
    }),
    [reduceMotion],
  )

  const pageTransition = reduceMotion ? REDUCED_MOTION : PAGE
  const mobilePageTransition = reduceMotion ? REDUCED_MOTION : MOBILE_PAGE_TRANSITION

  return (
    <div className="flex-1 flex flex-col min-h-0 relative overflow-hidden">
      <div className="md:hidden flex flex-1 min-h-0 flex-col overflow-hidden">
        <div
          className={`relative flex-1 min-h-0 overflow-hidden ${
            isMobileTransitioning ? 'pointer-events-none' : ''
          }`}
        >
          <AnimatePresence
            initial={false}
            custom={mobileDirection}
            onExitComplete={handleMobileExitComplete}
          >
            <motion.div
              key={getMobileRouteKey(mobileRoute)}
              custom={mobileDirection}
              variants={mobilePageVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={mobilePageTransition}
              data-settings-mobile-page
              className={`absolute inset-y-0 left-0 w-full min-h-0 overflow-hidden ${
                isMobileTransitioning ? 'pointer-events-none' : ''
              }`}
            >
              <MobilePageSurface
                header={mobileHeader}
                renderHeader={renderHeader}
                onFocusCapture={keepFocusedFieldVisible}
              >
                {renderMobileContent}
              </MobilePageSurface>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <div className="hidden md:flex flex-1 min-h-0">
        <div className="w-[260px] border-r border-border flex-shrink-0 flex flex-col p-3">
          <SettingsNav
            activeTab={desktopTab}
            onTabChange={handleDesktopTabChange}
            labels={sidebarLabels}
            orientation="vertical"
          />
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
          <AnimatePresence mode="wait">
            <motion.div
              key={desktopTab}
              initial={
                suppressDesktopContentInitialRef.current
                  ? false
                  : { opacity: 0, y: desktopDirection * 16 }
              }
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: desktopDirection * -8 }}
              transition={pageTransition}
              className="p-5"
            >
              {renderDesktopContent}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}

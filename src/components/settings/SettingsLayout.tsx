import {
  useState,
  useMemo,
  useRef,
  useEffect,
  type ChangeEvent,
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
import { SERVER_REGIONS } from '../../utils/defaultData'
import { PAGE } from '../../utils/motion'
import { useSettings } from '../../context/SettingsContext'

interface SettingsLayoutProps {
  onManualReset: (tab: TabType) => void
  onExport: () => void
  onImportFile: (event: ChangeEvent<HTMLInputElement>) => void
  fileInputRef: RefObject<HTMLInputElement | null>
  isImportError: boolean
  isImportSuccess: boolean
  isExportSuccess: boolean
  cloudSyncProps?: CloudSyncProps
  renderHeader?: (
    activeTab: SubPage | null,
    setActiveTab: (tab: SubPage | null) => void,
  ) => ReactNode
}

const REGION_LABELS: Record<string, string> = Object.fromEntries(
  Object.entries(SERVER_REGIONS).map(([region, regionInfo]) => [region, regionInfo.label]),
)

export function SettingsLayout({
  onManualReset,
  onExport,
  onImportFile,
  fileInputRef,
  isImportError,
  isImportSuccess,
  isExportSuccess,
  cloudSyncProps,
  renderHeader,
}: SettingsLayoutProps) {
  const { settings } = useSettings()
  const [activeTab, setActiveTab] = useState<SubPage | null>(null)
  const [direction, setDirection] = useState(1)
  const prevIndexRef = useRef(0)
  const suppressMobileNavInitialRef = useRef(true)
  const suppressDesktopContentInitialRef = useRef(true)

  useEffect(() => {
    suppressMobileNavInitialRef.current = false
    suppressDesktopContentInitialRef.current = false
  }, [])

  const TAB_ORDER: SubPage[] = ['general', 'server', 'cloud', 'data']

  const handleTabChange = (tab: SubPage | null) => {
    if (tab !== null && activeTab !== null) {
      const oldIndex = TAB_ORDER.indexOf(activeTab)
      const newIndex = TAB_ORDER.indexOf(tab)
      if (newIndex !== oldIndex) {
        setDirection(newIndex > oldIndex ? 1 : -1)
        prevIndexRef.current = newIndex
      }
    }
    setActiveTab(tab)
  }

  const sidebarLabels = useMemo<Record<SubPage, string | undefined>>(
    () => ({
      general: undefined,
      server: REGION_LABELS[settings.serverRegion] ?? '亚太服',
      cloud: cloudSyncProps?.isConfigured ? '已连接' : '未配置',
      data: undefined,
    }),
    [settings.serverRegion, cloudSyncProps?.isConfigured],
  )

  const tab = activeTab ?? 'general'

  const renderContent = useMemo(() => {
    switch (tab) {
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
        return (
          <SettingsData
            onManualReset={onManualReset}
            onExport={onExport}
            onImportFile={onImportFile}
            fileInputRef={fileInputRef}
            isImportError={isImportError}
            isImportSuccess={isImportSuccess}
            isExportSuccess={isExportSuccess}
            isEmbedded
          />
        )
    }
  }, [
    tab,
    cloudSyncProps,
    onManualReset,
    onExport,
    onImportFile,
    fileInputRef,
    isImportError,
    isImportSuccess,
    isExportSuccess,
  ])

  return (
    <div className="flex-1 flex flex-col min-h-0 relative overflow-hidden">
      <div className="md:hidden flex-1 flex flex-col min-h-0 overflow-hidden">
        {renderHeader?.(activeTab, handleTabChange)}
        <AnimatePresence mode="wait">
          {!activeTab ? (
            <motion.div
              key="mobile-nav"
              initial={suppressMobileNavInitialRef.current ? false : { opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={PAGE}
              className="flex-1 overflow-y-auto overscroll-contain p-4"
            >
              <SettingsNav activeTab={tab} onTabChange={handleTabChange} labels={sidebarLabels} />
            </motion.div>
          ) : (
            <motion.div
              key="mobile-content"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 16 }}
              transition={PAGE}
              className="flex-1 flex flex-col min-h-0"
            >
              <div className="flex-1 overflow-y-auto overscroll-contain p-4">{renderContent}</div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="hidden md:flex flex-1 min-h-0">
        <div className="w-[240px] lg:w-[260px] border-r border-border flex-shrink-0 flex flex-col p-3">
          <SettingsNav
            activeTab={tab}
            onTabChange={handleTabChange}
            labels={sidebarLabels}
            orientation="vertical"
          />
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={
                suppressDesktopContentInitialRef.current ? false : { opacity: 0, y: direction * 16 }
              }
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: direction * -8 }}
              transition={PAGE}
              className="p-5"
            >
              {renderContent}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}

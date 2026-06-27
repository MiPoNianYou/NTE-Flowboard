import { useState, useMemo, type ChangeEvent, type RefObject } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { ArrowLeft } from 'lucide-react'
import type { TabType } from '../../types'
import type { CloudSyncProps } from './CloudSyncSection'
import { SettingsNav, NAV_ITEMS, type SubPage } from './SettingsNav'
import { SettingsGeneral } from './SettingsGeneral'
import { SettingsServer } from './SettingsServer'
import { SettingsData } from './SettingsData'
import { CloudSyncSection } from './CloudSyncSection'
import { Button } from '../base/Button'
import { SERVER_REGIONS } from '../../utils/storage'
import { SPRING } from '../../utils/motion'
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
}: SettingsLayoutProps) {
  const { settings } = useSettings()
  const [activeTab, setActiveTab] = useState<SubPage | null>(null)

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
      {/* Mobile layout */}
      <div className="md:hidden flex-1 flex flex-col min-h-0 overflow-hidden">
        <AnimatePresence mode="wait">
          {!activeTab ? (
            <motion.div
              key="mobile-nav"
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={SPRING}
              className="flex-1 overflow-y-auto overscroll-contain p-4"
            >
              <SettingsNav activeTab={tab} onTabChange={setActiveTab} labels={sidebarLabels} />
            </motion.div>
          ) : (
            <motion.div
              key="mobile-content"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 16 }}
              transition={SPRING}
              className="flex-1 flex flex-col min-h-0"
            >
              <div className="flex items-center gap-3 px-4 py-3 border-b border-border flex-shrink-0 glass">
                <Button variant="tertiary" onClick={() => setActiveTab(null)} className="p-1.5">
                  <ArrowLeft className="size-5" />
                </Button>
                <h2 className="flex-1 text-base font-bold text-text-primary">
                  {NAV_ITEMS.find((navItem) => navItem.id === activeTab)?.label ?? ''}
                </h2>
              </div>
              <div className="flex-1 overflow-y-auto overscroll-contain p-4">{renderContent}</div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Desktop layout */}
      <div className="hidden md:flex flex-1 min-h-0">
        <div className="w-[240px] lg:w-[260px] border-r border-border flex-shrink-0 flex flex-col p-3">
          <SettingsNav
            activeTab={tab}
            onTabChange={setActiveTab}
            labels={sidebarLabels}
            orientation="vertical"
          />
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={SPRING}
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

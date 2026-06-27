import { memo } from 'react'
import type { TabType, ChecklistData } from '../types'
import type { CloudSyncProps } from './settings/CloudSyncSection'
import { SettingsPanel } from './SettingsPanel'
import { OfflineIndicator } from './OfflineIndicator'
import NanallyLogo from '../assets/nanally.webp'

interface HeaderProps {
  data: ChecklistData
  onManualReset: (tab: TabType) => void
  onImport: (data: ChecklistData) => void
  cloudSyncProps?: CloudSyncProps
}

export const Header = memo(function Header({
  data,
  onManualReset,
  onImport,
  cloudSyncProps,
}: HeaderProps) {
  return (
    <div className="flex items-center justify-between mb-8 md:mb-7">
      <div className="flex items-center gap-3 md:gap-3">
        <a
          href="https://github.com/MiPoNianYou/NTE-Flowboard"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="GitHub"
        >
          <img src={NanallyLogo} alt="Nanally" className="w-10 h-10 md:w-12 md:h-12" />
        </a>
        <div>
          <h1 className="text-lg md:text-xl font-bold text-text-primary tracking-tight chromatic-aberration">
            NTE Flowboard
          </h1>
          <p className="text-xs md:text-xs text-text-muted">每日 · 每周 · 每月任务追踪</p>
        </div>
      </div>
      <OfflineIndicator />
      <div className="flex items-center gap-3">
        <SettingsPanel
          data={data}
          onManualReset={onManualReset}
          onImport={onImport}
          cloudSyncProps={cloudSyncProps}
        />
      </div>
    </div>
  )
})

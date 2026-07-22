import { memo } from 'react'
import type { TabType, ChecklistData } from '../types'
import type { CloudSyncProps } from './settings/CloudSyncSection'
import { SettingsPanel } from './SettingsPanel'
import { OfflineIndicator } from './OfflineIndicator'
import ShinkuLogo from '../assets/shinku-logo.png'
import { useTranslation } from 'react-i18next'

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
  const { t } = useTranslation()
  return (
    <div className="flex items-center justify-between mb-5 md:mb-7">
      <div className="flex items-center gap-2 md:gap-3">
        <a
          href="https://github.com/MiPoNianYou/NTE-Flowboard"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="GitHub"
        >
          <img src={ShinkuLogo} alt="Shinku" className="w-9 h-9 md:w-12 md:h-12" />
        </a>
        <div>
          <h1 className="text-base md:text-xl font-bold text-text-primary tracking-tight chromatic-aberration">
            NTE Flowboard
          </h1>
          <p className="text-[11px] md:text-xs text-text-muted">{t('header.tagline')}</p>
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

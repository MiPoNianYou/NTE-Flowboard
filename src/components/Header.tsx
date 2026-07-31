import { memo } from 'react'
import type { TabType, ChecklistData } from '../types'
import type { CloudSyncProps } from './settings/CloudSyncSection'
import { SettingsPanel } from './SettingsPanel'
import { OfflineIndicator } from './OfflineIndicator'
import ShinkuLogo from '../assets/shinku-logo.png'
import { useTranslation } from 'react-i18next'
import type { RestoreDefaultsControls } from '../utils/checklistRestoreBackup'

interface HeaderProps {
  data: ChecklistData
  onManualReset: (tab: TabType) => void
  restoreDefaultsControls: RestoreDefaultsControls
  onImport: (data: ChecklistData) => void
  cloudSyncProps?: CloudSyncProps
}

export const Header = memo(function Header({
  data,
  onManualReset,
  restoreDefaultsControls,
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
          <img src={ShinkuLogo} alt="Shinku" className="w-8 h-8 md:w-10 md:h-10" />
        </a>
        <div>
          <h1 className="text-lg md:text-xl font-semibold text-text-primary">NTE Flowboard</h1>
          <p className="text-xs text-text-muted">{t('header.tagline')}</p>
        </div>
      </div>
      <OfflineIndicator />
      <div className="flex items-center gap-3">
        <SettingsPanel
          data={data}
          onManualReset={onManualReset}
          restoreDefaultsControls={restoreDefaultsControls}
          onImport={onImport}
          cloudSyncProps={cloudSyncProps}
        />
      </div>
    </div>
  )
})

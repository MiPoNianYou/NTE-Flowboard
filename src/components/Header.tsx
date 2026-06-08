import { memo } from 'react'
import { LayoutGrid, Rows3 } from 'lucide-react'
import type { TabType, ChecklistData, ResetConfig, SettingsProps, CloudSyncBaseProps } from '../types'
import { SettingsPanel } from './SettingsPanel'
import { cn } from '../utils/cn'
import { logoDataUri } from '../assets/logo'
import { Button } from './base/Button'

interface HeaderProps {
  layout: 'single' | 'two-column'
  toggleLayout: () => void
  data: ChecklistData
  onManualReset: (tab: TabType) => void
  onImport: (data: ChecklistData) => void
  onResetConfigChange: (config: ResetConfig) => void
  settings: SettingsProps
  cloudSyncProps?: CloudSyncBaseProps
}

export const Header = memo(function Header({
  layout,
  toggleLayout,
  data,
  onManualReset,
  onImport,
  onResetConfigChange,
  settings,
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
          <img src={logoDataUri} alt="Nanally" className="w-10 h-10 md:w-12 md:h-12" />
        </a>
        <div>
          <h1 className="text-lg md:text-xl font-bold text-text-primary tracking-tight">
            NTE Flowboard
          </h1>
          <p className="text-xs md:text-xs text-text-muted">
            每日与每周事项追踪
          </p>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <Button
          variant="tertiary"
          onClick={toggleLayout}
          className={cn(
            'p-2 lg:p-2',
            'hidden md:flex',
          )}
          aria-label={layout === 'two-column' ? '切换为单列布局' : '切换为双列布局'}
        >
          {layout === 'two-column' ? (
            <Rows3 className="size-[20px] lg:size-[22px]" />
          ) : (
            <LayoutGrid className="size-[20px] lg:size-[22px]" />
          )}
        </Button>
        <SettingsPanel
          data={data}
          onManualReset={onManualReset}
          onImport={onImport}
          onResetConfigChange={onResetConfigChange}
          settings={settings}
          cloudSyncProps={cloudSyncProps}
        />
      </div>
    </div>
  )
})

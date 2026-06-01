import { memo } from 'react'
import { Sun, Moon, Monitor, Smartphone, LayoutGrid, Rows3 } from 'lucide-react'
import type { TabType, ChecklistData, ResetConfig } from '../types'
import type { CloudSyncProps } from './SettingsContent'
import { SettingsPanel } from './SettingsPanel'
import { cn } from '../utils/cn'
import { logoDataUri } from '../assets/logo'

interface HeaderProps {
  dark: boolean
  mode: 'light' | 'dark' | 'system'
  cycleTheme: () => void
  layout: 'single' | 'two-column'
  toggleLayout: () => void
  data: ChecklistData
  autoMoveCompleted: boolean
  onAutoMoveCompletedChange: (newVal: boolean) => void
  onManualReset: (tab: TabType) => void
  onImport: (data: ChecklistData) => void
  onResetConfigChange: (config: ResetConfig) => void
  cloudSyncProps?: Omit<
    CloudSyncProps,
    'onRequestDisconnect' | 'onCancelDisconnect' | 'showDisconnectConfirm'
  >
}

export const Header = memo(function Header({
  mode,
  cycleTheme,
  layout,
  toggleLayout,
  data,
  autoMoveCompleted,
  onAutoMoveCompletedChange,
  onManualReset,
  onImport,
  onResetConfigChange,
  cloudSyncProps,
}: HeaderProps) {
  return (
    <div className="flex items-center justify-between mb-8 md:mb-7">
      <div className="flex items-center gap-3 md:gap-3.5">
        <a
          href="https://github.com/MiPoNianYou/NTE-Flowboard"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="GitHub"
        >
          <img src={logoDataUri} alt="Nanally" className="w-10 h-10 md:w-12 md:h-12" />
        </a>
        <div>
          <h1 className="text-lg md:text-xl font-bold text-gray-800 dark:text-gray-100 tracking-tight">
            NTE Flowboard
          </h1>
          <p className="text-2xs md:text-xs text-gray-400 dark:text-gray-500">
            每日与每周事项追踪
          </p>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={cycleTheme}
          className="p-2 lg:p-2 rounded-xl text-gray-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/30 transition-colors active:scale-[0.97]"
          aria-label={`当前主题：${mode === 'system' ? '跟随系统' : mode === 'dark' ? '深色' : '浅色'}，点击切换`}
        >
          {mode === 'light' && <Sun className="size-[20px] lg:size-[22px]" />}
          {mode === 'dark' && <Moon className="size-[20px] lg:size-[22px]" />}
          {mode === 'system' && (
            <>
              <Smartphone className="size-[20px] lg:hidden" />
              <Monitor className="size-[22px] hidden lg:block" />
            </>
          )}
        </button>
        <button
          onClick={toggleLayout}
          className={cn(
            'p-2 lg:p-2 rounded-xl text-gray-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors active:scale-[0.97]',
            'hidden md:flex',
          )}
          aria-label={layout === 'two-column' ? '切换为单列布局' : '切换为双列布局'}
        >
          {layout === 'two-column' ? (
            <Rows3 className="size-[20px] lg:size-[22px]" />
          ) : (
            <LayoutGrid className="size-[20px] lg:size-[22px]" />
          )}
        </button>
        <SettingsPanel
          data={data}
          autoMoveCompleted={autoMoveCompleted}
          onAutoMoveCompletedChange={onAutoMoveCompletedChange}
          onManualReset={onManualReset}
          onImport={onImport}
          onResetConfigChange={onResetConfigChange}
          cloudSyncProps={cloudSyncProps}
        />
      </div>
    </div>
  )
})

import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import {
  RotateCcw,
  AlertTriangle,
  Unplug,
  Globe,
  Cloud,
  Database,
  ChevronRight,
} from 'lucide-react'
import type { TabType, ResetConfig } from '../types'
import { CloudSyncSection } from './CloudSyncSection'
import { SettingsServer } from './SettingsServer'
import { SettingsData } from './SettingsData'
import type { SyncStatus } from '../hooks/useSupabaseSync'
import { cn } from '../utils/cn'
import { SERVER_REGIONS } from '../utils/storage'

export interface CloudSyncProps {
  syncStatus: SyncStatus
  lastSyncTime: string | null
  syncError: string | null
  isConfigured: boolean
  isLocked: boolean
  onSetupSupabase: (projectId: string, anonKey: string, syncKey: string) => Promise<void>
  onUnlock: (syncKey: string) => Promise<boolean>
  onTriggerSync: () => Promise<void>
  onRequestDisconnect: () => void
  onCancelDisconnect: () => void
  onConfirmDisconnect: () => void
  showDisconnectConfirm: boolean
}

type SubPage = 'server' | 'cloud' | 'data'

interface SettingsContentProps {
  confirmTarget: TabType | null
  onConfirmTarget: (tab: TabType | null) => void
  onConfirmReset: () => void
  onExport: () => void
  onImportFile: (e: React.ChangeEvent<HTMLInputElement>) => void

  fileInputRef: React.RefObject<HTMLInputElement | null>
  importError: string
  importSuccess: boolean
  cloudSyncProps?: CloudSyncProps
  autoMoveCompleted: boolean
  onAutoMoveCompletedChange: (newVal: boolean) => void
  resetConfig: ResetConfig
  onResetConfigChange: (config: ResetConfig) => void
}

const REGION_LABELS: Record<string, string> = Object.fromEntries(
  Object.entries(SERVER_REGIONS).map(([k, v]) => [k, v.label]),
)

export function SettingsContent({
  confirmTarget,
  onConfirmTarget,
  onConfirmReset,
  onExport,
  onImportFile,
  fileInputRef,
  importError,
  importSuccess,
  cloudSyncProps,
  autoMoveCompleted,
  onAutoMoveCompletedChange,
  resetConfig,
  onResetConfigChange,
}: SettingsContentProps) {
  const [subPage, setSubPage] = useState<SubPage | null>(null)
  const hasOverlay = !!(confirmTarget || cloudSyncProps?.showDisconnectConfirm)

  return (
    <div className="flex-1 flex flex-col min-h-0 relative overflow-hidden">
      {/* Main settings page */}
      <div
        className={cn(
          'flex-1 flex flex-col min-h-0 transition-opacity duration-200',
          hasOverlay && 'invisible opacity-0 pointer-events-none',
        )}
      >
        <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-4 space-y-1">
          {/* Menu items */}
          <MenuItem
            icon={<Globe className="size-4" />}
            label="服务器设置"
            value={REGION_LABELS[resetConfig.serverRegion] ?? '亚太服'}
            onClick={() => setSubPage('server')}
          />
          <MenuItem
            icon={<Cloud className="size-4" />}
            label="云同步"
            value={cloudSyncProps?.isConfigured ? '已连接' : '未配置'}
            onClick={() => setSubPage('cloud')}
          />
          <MenuItem
            icon={<Database className="size-4" />}
            label="数据管理"
            onClick={() => setSubPage('data')}
          />

          {/* Divider */}
          <div className="h-px bg-gray-200/50 dark:bg-white/10 my-3" />

          {/* Manual reset */}
          <div className="px-1">
            <p className="text-[11px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">
              手动重置
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => onConfirmTarget('daily')}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-amber-50/80 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-colors active:scale-[0.97] text-sm font-medium border border-amber-200/50 dark:border-amber-700/30"
              >
                <RotateCcw className="size-3.5" />
                重置每日
              </button>
              <button
                onClick={() => onConfirmTarget('weekly')}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-purple-50/80 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900/50 transition-colors active:scale-[0.97] text-sm font-medium border border-purple-200/50 dark:border-purple-700/30"
              >
                <RotateCcw className="size-3.5" />
                重置每周
              </button>
            </div>
          </div>

          {/* Behavior */}
          <div className="px-1 pt-2">
            <p className="text-[11px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">
              行为设置
            </p>
            <ToggleSwitch
              label="完成事项自动移至底部"
              checked={autoMoveCompleted}
              onCheckedChange={onAutoMoveCompletedChange}
            />
          </div>
        </div>
      </div>

      {/* Sub pages */}
      <AnimatePresence>
        {subPage === 'server' && (
          <SettingsServer
            key="server"
            resetConfig={resetConfig}
            onResetConfigChange={onResetConfigChange}
            onBack={() => setSubPage(null)}
          />
        )}
        {subPage === 'cloud' && cloudSyncProps && (
          <motion.div
            key="cloud"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 350, damping: 35 }}
            className="absolute inset-0 flex flex-col bg-white/90 dark:bg-gray-900/95 backdrop-blur-xl z-10"
          >
            <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200/60 dark:border-white/10 flex-shrink-0">
              <button
                onClick={() => setSubPage(null)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100/60 dark:hover:bg-white/10 transition-colors active:scale-[0.97]"
              >
                <svg
                  className="size-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100">云同步</h2>
            </div>
            <div className="flex-1 overflow-y-auto overscroll-contain p-5">
              <CloudSyncSection {...cloudSyncProps} />
            </div>
          </motion.div>
        )}
        {subPage === 'data' && (
          <SettingsData
            key="data"
            onExport={onExport}
            onImportFile={onImportFile}
            fileInputRef={fileInputRef}
            importError={importError}
            importSuccess={importSuccess}
            onBack={() => setSubPage(null)}
          />
        )}
      </AnimatePresence>

      {/* Confirm reset overlay */}
      <AnimatePresence>
        {confirmTarget && (
          <motion.div
            key="confirm-reset"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 flex items-center justify-center z-20"
          >
            <div
              className="absolute inset-0 bg-black/20 backdrop-blur-sm"
              onClick={() => onConfirmTarget(null)}
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="relative w-full max-w-xs bg-white/95 dark:bg-gray-800/90 rounded-2xl p-5 space-y-4 border border-gray-200/50 dark:border-white/10 shadow-elevated mx-4"
            >
              <div className="flex flex-col items-center text-center space-y-2">
                <div className="p-2.5 rounded-full bg-red-100 dark:bg-red-900/40">
                  <AlertTriangle className="size-5 text-red-600 dark:text-red-400" />
                </div>
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                  {confirmTarget === 'daily' ? '重置每日清单' : '重置每周清单'}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                  {confirmTarget === 'daily'
                    ? '所有每日任务的完成状态将被清除，此操作不可撤销。'
                    : '所有每周任务的完成状态将被清除，此操作不可撤销。'}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => onConfirmTarget(null)}
                  className="flex-1 py-2 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 transition-colors active:scale-[0.97]"
                >
                  取消
                </button>
                <button
                  onClick={onConfirmReset}
                  className="flex-1 py-2 rounded-xl text-sm font-medium bg-red-500 hover:bg-red-600 text-white transition-colors active:scale-[0.97]"
                >
                  确认重置
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Disconnect cloud sync overlay */}
      <AnimatePresence>
        {cloudSyncProps?.showDisconnectConfirm && (
          <motion.div
            key="confirm-disconnect"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 flex items-center justify-center z-20"
          >
            <div
              className="absolute inset-0 bg-black/20 backdrop-blur-sm"
              onClick={cloudSyncProps?.onCancelDisconnect}
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="relative w-full max-w-xs bg-white/95 dark:bg-gray-800/90 rounded-2xl p-5 space-y-4 border border-gray-200/50 dark:border-white/10 shadow-elevated mx-4"
            >
              <div className="flex flex-col items-center text-center space-y-2">
                <div className="p-2.5 rounded-full bg-amber-100 dark:bg-amber-900/40">
                  <Unplug className="size-5 text-amber-600 dark:text-amber-400" />
                </div>
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">断开云同步</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                  断开后本地数据仍会保留，但不再自动同步。
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={cloudSyncProps?.onCancelDisconnect}
                  className="flex-1 py-2 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 transition-colors active:scale-[0.97]"
                >
                  取消
                </button>
                <button
                  onClick={cloudSyncProps?.onConfirmDisconnect}
                  className="flex-1 py-2 rounded-xl text-sm font-medium bg-amber-500 hover:bg-amber-600 text-white transition-colors active:scale-[0.97]"
                >
                  确认断开
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// --- Menu item component ---
function MenuItem({
  icon,
  label,
  value,
  onClick,
}: {
  icon: React.ReactNode
  label: string
  value?: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 transition-colors active:scale-[0.98] text-left"
    >
      <div className="size-8 rounded-lg bg-gray-100 dark:bg-white/10 flex items-center justify-center text-gray-500 dark:text-gray-400">
        {icon}
      </div>
      <span className="flex-1 text-sm font-medium text-gray-700 dark:text-gray-200">{label}</span>
      {value && <span className="text-xs text-gray-400 dark:text-gray-500 mr-1">{value}</span>}
      <ChevronRight className="size-4 text-gray-300 dark:text-gray-600" />
    </button>
  )
}

// --- Toggle switch component ---
function ToggleSwitch({
  label,
  checked,
  onCheckedChange,
}: {
  label: string
  checked: boolean
  onCheckedChange: (newVal: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between py-2 px-1">
      <span className="text-sm text-gray-700 dark:text-gray-200">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onCheckedChange(!checked)}
        className={cn(
          'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2',
          checked ? 'bg-emerald-500' : 'bg-gray-200 dark:bg-gray-600',
        )}
      >
        <motion.span
          animate={{ x: checked ? 24 : 0 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          className="pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm"
        />
      </button>
    </div>
  )
}

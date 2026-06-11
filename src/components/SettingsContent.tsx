import { useState, useMemo, type ChangeEvent, type RefObject } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import {
  AlertTriangle,
  Unplug,
  Globe,
  Cloud,
  Database,
  Settings2,
  ChevronRight,
} from 'lucide-react'
import type { TabType, ResetConfig, CloudSyncProps } from '../types'
import { CloudSyncSection } from './CloudSyncSection'
import { CloudSyncHelp } from './CloudSyncHelp'
import { SettingsServer } from './SettingsServer'
import { SettingsData } from './SettingsData'
import { SettingsGeneral } from './SettingsGeneral'
import { ConfirmDialog } from './ConfirmDialog'
import { NavBar } from './base/NavBar'
import { cn } from '../utils/cn'
import { SERVER_REGIONS } from '../utils/storage'
import { Button } from './base/Button'
import { Card } from './base/Card'

type SubPage = 'general' | 'server' | 'cloud' | 'data'

interface SettingsContentProps {
  confirmTarget: TabType | null
  onConfirmTarget: (tab: TabType | null) => void
  onConfirmReset: () => void
  onExport: () => void
  onImportFile: (e: ChangeEvent<HTMLInputElement>) => void

  fileInputRef: RefObject<HTMLInputElement | null>
  importError: string
  importSuccess: boolean
  cloudSyncProps?: CloudSyncProps
  autoMoveCompleted: boolean
  onAutoMoveCompletedChange: (newVal: boolean) => void
  confirmDelete: boolean
  onConfirmDeleteChange: (newVal: boolean) => void
  resetConfig: ResetConfig
  onResetConfigChange: (config: ResetConfig) => void
  cloudSyncBehavior: boolean
  onCloudSyncBehaviorChange: (value: boolean) => void
  showCustomTab: boolean
  onShowCustomTabChange: (value: boolean) => void
}

const NAV_ITEMS: {
  id: SubPage
  icon: typeof Globe
  label: string
  iconBg: string
  iconColor: string
}[] = [
  {
    id: 'general',
    icon: Settings2,
    label: '通用',
    iconBg: 'bg-elevated border border-border',
    iconColor: 'text-text-secondary',
  },
  {
    id: 'server',
    icon: Globe,
    label: '服务器设置',
    iconBg: 'bg-info-soft',
    iconColor: 'text-info',
  },
  {
    id: 'cloud',
    icon: Cloud,
    label: '云同步',
    iconBg: 'bg-primary-soft',
    iconColor: 'text-primary',
  },
  {
    id: 'data',
    icon: Database,
    label: '数据管理',
    iconBg: 'bg-success-soft',
    iconColor: 'text-success',
  },
]

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
  confirmDelete,
  onConfirmDeleteChange,
  resetConfig,
  onResetConfigChange,
  cloudSyncBehavior,
  onCloudSyncBehaviorChange,
  showCustomTab,
  onShowCustomTabChange,
}: SettingsContentProps) {
  const [activeTab, setActiveTab] = useState<SubPage | null>(null)
  const hasOverlay = !!(confirmTarget || cloudSyncProps?.showDisconnectConfirm)

  const sidebarLabels = useMemo<Record<SubPage, string | undefined>>(
    () => ({
      general: undefined,
      server: REGION_LABELS[resetConfig.serverRegion] ?? '亚太服',
      cloud: cloudSyncProps?.isConfigured ? '已连接' : '未配置',
      data: undefined,
    }),
    [resetConfig.serverRegion, cloudSyncProps?.isConfigured],
  )

  const tab = activeTab ?? 'general'

  const renderContent = useMemo(() => {
    switch (tab) {
      case 'general':
        return (
          <SettingsGeneral
            autoMoveCompleted={autoMoveCompleted}
            onAutoMoveCompletedChange={onAutoMoveCompletedChange}
            confirmDelete={confirmDelete}
            onConfirmDeleteChange={onConfirmDeleteChange}
            showCustomTab={showCustomTab}
            onShowCustomTabChange={onShowCustomTabChange}
            embedded
          />
        )
      case 'server':
        return (
          <SettingsServer
            resetConfig={resetConfig}
            onResetConfigChange={onResetConfigChange}
            embedded
          />
        )
      case 'cloud':
        return cloudSyncProps ? (
          <div className="space-y-4">
            <CloudSyncSection
              {...cloudSyncProps}
              cloudSyncBehavior={cloudSyncBehavior}
              onCloudSyncBehaviorChange={onCloudSyncBehaviorChange}
            />
            {!cloudSyncProps.isConfigured && <CloudSyncHelp />}
          </div>
        ) : null
      case 'data':
        return (
          <SettingsData
            onConfirmTarget={onConfirmTarget}
            onExport={onExport}
            onImportFile={onImportFile}
            fileInputRef={fileInputRef}
            importError={importError}
            importSuccess={importSuccess}
            embedded
          />
        )
    }
  }, [
    tab,
    autoMoveCompleted,
    onAutoMoveCompletedChange,
    confirmDelete,
    onConfirmDeleteChange,
    resetConfig,
    onResetConfigChange,
    cloudSyncProps,
    cloudSyncBehavior,
    onCloudSyncBehaviorChange,
    showCustomTab,
    onShowCustomTabChange,
    onConfirmTarget,
    onExport,
    onImportFile,
    fileInputRef,
    importError,
    importSuccess,
  ])

  return (
    <div className="flex-1 flex flex-col min-h-0 relative overflow-hidden">
      {/* 设置主页面 */}
      <div
        className={cn(
          'flex-1 flex flex-col min-h-0 transition-opacity duration-150',
          hasOverlay && 'pointer-events-none',
        )}
      >
        {/* 移动端 */}
        <div className="md:hidden flex-1 flex flex-col min-h-0 overflow-hidden">
          <AnimatePresence mode="wait">
            {!activeTab ? (
              <motion.div
                key="mobile-nav"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.15 }}
                className="flex-1 overflow-y-auto overscroll-contain px-4 py-3 sm:px-5 sm:py-4"
              >
                <Card variant="elevated" className="overflow-hidden">
                  {NAV_ITEMS.map((item, i) => (
                    <Button
                      key={item.id}
                      variant="tertiary"
                      onClick={() => setActiveTab(item.id)}
                      className={cn(
                        'w-full justify-start gap-3 sm:gap-4 px-3 py-2 sm:py-3',
                        i < NAV_ITEMS.length - 1 && 'border-b border-border',
                      )}
                    >
                      <div
                        className={cn(
                          'size-8 sm:size-9 rounded-lg flex items-center justify-center',
                          item.iconBg,
                        )}
                      >
                        <item.icon className="size-4" />
                      </div>
                      <span className="flex-1 text-[15px] font-medium text-text-primary">
                        {item.label}
                      </span>
                      {sidebarLabels[item.id] && (
                        <span className="text-sm text-text-secondary mr-1">
                          {sidebarLabels[item.id]}
                        </span>
                      )}
                      <ChevronRight className="size-4 text-text-muted" />
                    </Button>
                  ))}
                </Card>
              </motion.div>
            ) : (
              <motion.div
                key="mobile-content"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.15 }}
                className="flex-1 flex flex-col min-h-0"
              >
                <NavBar
                  title={NAV_ITEMS.find((n) => n.id === activeTab)?.label ?? ''}
                  onBack={() => setActiveTab(null)}
                />
                <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-5">
                  {renderContent}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* 桌面端：侧边栏 + 内容 */}
        <div className="hidden md:flex flex-1 min-h-0">
          {/* 侧边栏 */}
          <div className="w-[240px] lg:w-[260px] border-r border-border flex-shrink-0 flex flex-col bg-surface">
            <nav className="py-4 px-3 space-y-1">
              {NAV_ITEMS.map((item) => {
                const isActive = (activeTab ?? 'general') === item.id
                return (
                  <Button
                    key={item.id}
                  variant="tertiary"
                  onClick={() => setActiveTab(item.id)}
                  className={cn(
                    'w-full justify-start gap-3 px-3 py-3 rounded-lg text-left group',
                    isActive
                      ? 'bg-elevated border border-border-strong'
                      : 'hover:bg-elevated',
                  )}
                >
                  <div
                    className={cn(
                      'size-8 rounded-lg flex items-center justify-center transition-transform duration-150 group-active:scale-95',
                      item.iconBg,
                    )}
                  >
                    <item.icon className={cn('size-4', item.iconColor)} />
                  </div>
                  <span
                    className={cn(
                      'flex-1 text-[13px]',
                      isActive
                        ? 'font-semibold text-text-primary'
                        : 'font-medium text-text-secondary',
                    )}
                  >
                    {item.label}
                  </span>
                  {sidebarLabels[item.id] && (
                    <span className="text-xs text-text-muted">
                      {sidebarLabels[item.id]}
                    </span>
                  )}
                  <ChevronRight
                    className={cn(
                      'size-3.5 transition-colors duration-150',
                      isActive
                        ? 'text-text-secondary'
                        : 'text-text-muted',
                    )}
                  />
                  </Button>
                )})}
            </nav>
          </div>

          {/* 内容区域 */}
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab ?? 'general'}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.12 }}
                className="p-6"
              >
                {renderContent}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* 确认重置遮罩 */}
      <AnimatePresence>
        {confirmTarget && (
          <ConfirmDialog
            key="confirm-reset"
            open
            onCancel={() => onConfirmTarget(null)}
            onConfirm={onConfirmReset}
            icon={<AlertTriangle className="size-5 text-danger" />}
            iconBg="bg-danger-soft"
            title={confirmTarget === 'daily' ? '重置每日清单进度' : '重置每周清单进度'}
            description={
              confirmTarget === 'daily'
                ? <>{'所有每日任务的完成状态将被清除'}<br />{'此操作不可撤销'}</>
                : <>{'所有每周任务的完成状态将被清除'}<br />{'此操作不可撤销'}</>
            }
            confirmLabel="确认重置"
            confirmVariant="danger"
          />
        )}
      </AnimatePresence>

      {/* 断开云同步遮罩 */}
      <AnimatePresence>
        {cloudSyncProps?.showDisconnectConfirm && (
          <ConfirmDialog
            key="confirm-disconnect"
            open
            onCancel={cloudSyncProps?.onCancelDisconnect}
            onConfirm={cloudSyncProps?.onConfirmDisconnect}
            icon={<Unplug className="size-5 text-warning" />}
            iconBg="bg-warning-soft"
            title="断开云同步"
            description={<>{'断开后本地数据仍会保留'}<br />{'但不再自动同步'}</>}
            confirmLabel="确认断开"
            confirmVariant="warning"
          />
        )}
      </AnimatePresence>
    </div>
  )
}

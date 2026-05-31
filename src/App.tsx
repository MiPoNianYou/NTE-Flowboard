import { useState, useMemo } from 'react'
import { Sun, Moon, Monitor, Smartphone, LayoutGrid, Rows3 } from 'lucide-react'
import { useChecklist } from './hooks/useChecklist'
import { useSupabaseSync } from './hooks/useSupabaseSync'
import { useTabManagement } from './hooks/useTabManagement'
import { useLayoutManagement } from './hooks/useLayoutManagement'
import { useThemeManagement } from './hooks/useThemeManagement'
import { useItemAnimation } from './hooks/useItemAnimation'
import { useNextResetLabel } from './hooks/useNextResetLabel'
import { TabSwitch } from './components/TabSwitch'
import { ProgressCard } from './components/ProgressCard'
import { HiddenSection } from './components/HiddenSection'
import { ChecklistPanel } from './components/ChecklistPanel'
import { SettingsPanel } from './components/SettingsPanel'
import { ErrorBoundary } from './components/ErrorBoundary'
import { OfflineIndicator } from './components/OfflineIndicator'
import { cn } from './utils/cn'
import { logoDataUri } from './assets/logo'

function App() {
  // 使用拆分后的 Hook
  const { activeTab, setActiveTab } = useTabManagement()
  const { layout, toggleLayout } = useLayoutManagement()
  const { dark, mode, cycleTheme } = useThemeManagement()

  const [autoMoveCompleted, setAutoMoveCompleted] = useState(
    () => localStorage.getItem('nte-auto-move-completed') !== 'false',
  )

  const handleAutoMoveCompletedChange = (newVal: boolean) => {
    setAutoMoveCompleted(newVal)
    localStorage.setItem('nte-auto-move-completed', String(newVal))
  }

  const {
    data,
    toggleItem,
    addItem,
    editItem,
    deleteItem,
    hideItem,
    showItem,
    reorderItems,
    manualReset,
    importFullData,
    updateResetConfig,
  } = useChecklist()

  const supabaseSync = useSupabaseSync({
    data,
    onDataImport: importFullData,
  })

  // 计算当前 Tab 的事项（使用 useMemo 缓存）
  const currentItems = useMemo(() => data[activeTab], [data, activeTab])
  const visibleItems = useMemo(() => currentItems.filter((i) => !i.hidden), [currentItems])
  const hiddenItems = useMemo(() => currentItems.filter((i) => i.hidden), [currentItems])
  const { completedCount, totalCount, allDone } = useMemo(() => {
    const completed = visibleItems.filter((i) => i.completed).length
    const total = visibleItems.length
    return {
      completedCount: completed,
      totalCount: total,
      allDone: total > 0 && completed === total,
    }
  }, [visibleItems])

  // 项目动画管理
  const { newItemOrders } = useItemAnimation(visibleItems)

  // 下次重置时间
  const nextResetLabel = useNextResetLabel({
    activeTab,
    resetConfig: data.resetConfig,
  })

  return (
    <ErrorBoundary>
      <div className={dark ? 'dark' : ''}>
        <OfflineIndicator />
        <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 via-indigo-50/30 to-purple-50/20 dark:from-gray-900 dark:via-gray-900 dark:to-indigo-950/30 transition-colors duration-500">
          {/* 装饰性背景光晕 */}
          <div className="fixed inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-40 -right-40 w-80 h-80 bg-indigo-200/20 dark:bg-indigo-600/5 rounded-full blur-3xl" />
            <div className="absolute top-1/2 -left-40 w-96 h-96 bg-purple-200/20 dark:bg-purple-600/5 rounded-full blur-3xl" />
            <div className="absolute -bottom-40 right-1/3 w-72 h-72 bg-emerald-200/15 dark:bg-emerald-600/5 rounded-full blur-3xl" />
          </div>

          <div className="relative max-w-lg md:max-w-[1100px] mx-auto px-4 py-8 sm:py-12 md:py-10 flex-1 w-full">
            {/* Header */}
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
                  onAutoMoveCompletedChange={handleAutoMoveCompletedChange}
                  onManualReset={manualReset}
                  onImport={importFullData}
                  onResetConfigChange={updateResetConfig}
                  cloudSyncProps={{
                    syncStatus: supabaseSync.syncStatus,
                    lastSyncTime: supabaseSync.lastSyncTime,
                    syncError: supabaseSync.syncError,
                    isConfigured: supabaseSync.isConfigured,
                    isLocked: supabaseSync.isLocked,
                    onSetupSupabase: supabaseSync.setupSupabase,
                    onUnlock: supabaseSync.unlock,
                    onTriggerSync: supabaseSync.triggerSync,
                    onConfirmDisconnect: supabaseSync.disconnect,
                  }}
                />
              </div>
            </div>

            {/* Unified layout for all screen sizes */}
            <div
              className={cn(
                'flex flex-col gap-6 items-start',
                layout === 'two-column' && 'md:flex-row md:flex-wrap lg:gap-8',
              )}
            >
              <div
                className={cn(
                  'space-y-4 w-full',
                  'md:space-y-5',
                  layout === 'two-column' && 'md:w-[260px] lg:w-[300px]',
                )}
              >
                <TabSwitch activeTab={activeTab} onTabChange={setActiveTab} />
                <ProgressCard
                  activeTab={activeTab}
                  completedCount={completedCount}
                  totalCount={totalCount}
                  allDone={allDone}
                  nextResetLabel={nextResetLabel}
                  layout={layout}
                />
                <HiddenSection
                  hiddenItems={hiddenItems}
                  activeTab={activeTab}
                  onShowItem={showItem}
                />
              </div>
              <div
                className={cn(
                  'min-w-0 w-full',
                  layout === 'two-column' && 'md:flex-1 md:sticky md:top-8 lg:top-10',
                )}
              >
                <ChecklistPanel
                  visibleItems={visibleItems}
                  activeTab={activeTab}
                  autoMoveCompleted={autoMoveCompleted}
                  newItemOrders={newItemOrders}
                  onToggle={toggleItem}
                  onEdit={editItem}
                  onDelete={deleteItem}
                  onHide={hideItem}
                  onReorder={reorderItems}
                  onAddItem={addItem}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  )
}

export default App

import { useMemo, useEffect } from 'react'
import { useChecklist } from './hooks/useChecklist'
import { useSupabaseSync } from './hooks/useSupabaseSync'
import { useTabManagement } from './hooks/useTabManagement'
import { useLayoutManagement } from './hooks/useLayoutManagement'
import { useThemeManagement } from './hooks/useThemeManagement'
import { useAutoMoveCompleted } from './hooks/useAutoMoveCompleted'
import { useItemAnimation } from './hooks/useItemAnimation'
import { useNextResetLabel } from './hooks/useNextResetLabel'
import { TabSwitch } from './components/TabSwitch'
import { ProgressCard } from './components/ProgressCard'
import { HiddenSection } from './components/HiddenSection'
import { ChecklistPanel } from './components/ChecklistPanel'
import { Header } from './components/Header'
import { ErrorBoundary } from './components/ErrorBoundary'
import { OfflineIndicator } from './components/OfflineIndicator'
import { cn } from './utils/cn'
import { setStorageErrorHandler } from './utils/storage'
import { StorageToast, showStorageToast } from './components/StorageToast'

function App() {
  // 使用拆分后的 Hook
  const { activeTab, setActiveTab } = useTabManagement()
  const { layout, toggleLayout } = useLayoutManagement()
  const { dark, mode, cycleTheme } = useThemeManagement()

  // 注册存储错误处理器
  useEffect(() => {
    setStorageErrorHandler((error, context) => {
      showStorageToast(`${context}：${error.message}`)
    })
    return () => setStorageErrorHandler(null)
  }, [])

  const { autoMoveCompleted, onAutoMoveCompletedChange } = useAutoMoveCompleted()

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
        <StorageToast />
        <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 via-indigo-50/30 to-purple-50/20 dark:from-gray-900 dark:via-gray-900 dark:to-indigo-950/30 transition-colors duration-500">
          {/* 装饰性背景光晕 */}
          <div className="fixed inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-40 -right-40 w-80 h-80 bg-indigo-200/20 dark:bg-indigo-600/5 rounded-full blur-3xl" />
            <div className="absolute top-1/2 -left-40 w-96 h-96 bg-purple-200/20 dark:bg-purple-600/5 rounded-full blur-3xl" />
            <div className="absolute -bottom-40 right-1/3 w-72 h-72 bg-emerald-200/15 dark:bg-emerald-600/5 rounded-full blur-3xl" />
          </div>

          <div className="relative max-w-lg md:max-w-[1100px] mx-auto px-4 py-8 sm:py-12 md:py-10 flex-1 w-full">
            {/* Header */}
            <Header
              dark={dark}
              mode={mode}
              cycleTheme={cycleTheme}
              layout={layout}
              toggleLayout={toggleLayout}
              data={data}
              autoMoveCompleted={autoMoveCompleted}
              onAutoMoveCompletedChange={onAutoMoveCompletedChange}
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

import { useMemo, useEffect, useCallback } from 'react'
import { motion } from 'motion/react'
import { cn } from './utils/cn'
import { useChecklist } from './hooks/useChecklist'
import { useSupabaseSync } from './hooks/useSupabaseSync'
import { useTabManagement } from './hooks/useTabManagement'
import { useLayoutManagement } from './hooks/useLayoutManagement'
import { useSettings } from './hooks/useSettings'
import { useItemAnimation } from './hooks/useItemAnimation'
import { useNextResetLabel } from './hooks/useNextResetLabel'
import { setStorageErrorHandler } from './utils/storage'
import { cleanupRegistry } from './utils/tagColors'
import { TabSwitch } from './components/TabSwitch'
import { ProgressCard } from './components/ProgressCard'
import { HiddenSection } from './components/HiddenSection'
import { ChecklistPanel } from './components/ChecklistPanel'
import { Header } from './components/Header'
import { ErrorBoundary } from './components/ErrorBoundary'
import { OfflineIndicator } from './components/OfflineIndicator'
import { StorageToast, showStorageToast } from './components/StorageToast'

function App() {
  const { activeTab, setActiveTab } = useTabManagement()
  const { layout, toggleLayout } = useLayoutManagement()

  useEffect(() => {
    setStorageErrorHandler((error, context) => {
      showStorageToast(`${context}：${error.message}`)
    })
    return () => setStorageErrorHandler(null)
  }, [])

  const {
    autoMoveCompleted, onAutoMoveCompletedChange,
    confirmDelete, onConfirmDeleteChange,
    cloudSyncBehavior, onCloudSyncBehaviorChange,
  } = useSettings()

  const handleSettingsImport = useCallback((settings: { autoMoveCompleted: boolean; confirmDelete: boolean }) => {
    onAutoMoveCompletedChange(settings.autoMoveCompleted)
    onConfirmDeleteChange(settings.confirmDelete)
  }, [onAutoMoveCompletedChange, onConfirmDeleteChange])

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
    setCustomResetMode,
    setCustomName,
  } = useChecklist()

  useEffect(() => {
    const allTags = [...data.daily, ...data.weekly, ...data.custom].flatMap(item => item.tags)
    cleanupRegistry(allTags)
  }, [data])

  const supabaseSync = useSupabaseSync({
    data,
    onDataImport: importFullData,
    onSettingsImport: handleSettingsImport,
    includeSettings: cloudSyncBehavior,
    settings: { autoMoveCompleted, confirmDelete },
  })

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

  const { newItemOrders } = useItemAnimation(visibleItems)

  const nextResetLabel = useNextResetLabel({
    activeTab,
    resetConfig: data.resetConfig,
    customResetMode: data.customResetMode,
  })

  return (
    <ErrorBoundary>
        <div className="relative min-h-screen flex flex-col transition-colors duration-150"
          style={{
            background: `
              radial-gradient(900px 600px at 88% 12%, rgba(91, 107, 255, 0.22), transparent 60%),
              radial-gradient(700px 500px at 6% 92%, rgba(61, 215, 229, 0.10), transparent 60%),
              radial-gradient(500px 400px at 60% 80%, rgba(255, 58, 92, 0.05), transparent 60%),
              linear-gradient(180deg, #0A0B0F 0%, #06070A 100%)
            `,
          }}
        >
        <OfflineIndicator />
        <StorageToast />

        <div className="relative max-w-lg md:max-w-[1100px] mx-auto px-4 py-8 sm:py-12 md:py-10 flex-1 w-full">
          <Header
            layout={layout}
            toggleLayout={toggleLayout}
            data={data}
            onManualReset={manualReset}
            onImport={importFullData}
            onResetConfigChange={updateResetConfig}
            settings={{
              autoMoveCompleted,
              onAutoMoveCompletedChange,
              confirmDelete,
              onConfirmDeleteChange,
              cloudSyncBehavior,
              onCloudSyncBehaviorChange,
            }}
            cloudSyncProps={{
              syncStatus: supabaseSync.syncStatus,
              lastSyncTime: supabaseSync.lastSyncTime,
              syncError: supabaseSync.syncError,
              isConfigured: supabaseSync.isConfigured,
              onSetupSupabase: supabaseSync.setupSupabase,
              onTriggerSync: supabaseSync.triggerSync,
              onConfirmDisconnect: supabaseSync.disconnect,
            }}
          />

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
              <TabSwitch activeTab={activeTab} onTabChange={setActiveTab} customName={data.customName} />
              <ProgressCard
                activeTab={activeTab}
                completedCount={completedCount}
                totalCount={totalCount}
                allDone={allDone}
                nextResetLabel={nextResetLabel}
                layout={layout}
                customName={data.customName}
              />
              {activeTab === 'custom' && (
                <div className="p-3 bg-surface rounded-xl border border-border space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-text-muted">清单名称</span>
                    <input
                      type="text"
                      value={data.customName ?? ''}
                      onChange={(e) => setCustomName(e.target.value)}
                      placeholder="自定义清单"
                      className="h-8 w-40 text-right text-sm bg-surface border border-border rounded-lg px-3 py-1.5 text-text-primary placeholder:text-text-muted outline-none focus:border-primary transition-colors duration-150"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-text-muted">重置模式</span>
                    <div className="flex h-8 w-40 items-center gap-0.5 p-0.5 bg-surface rounded-full border border-border">
                      {(['daily', 'weekly'] as const).map((mode) => (
                        <button
                          key={mode}
                          onClick={() => setCustomResetMode(mode)}
                          className="flex-1 flex items-center justify-center py-1.5 rounded-full text-sm font-medium relative z-10 transition-colors duration-150"
                        >
                          {data.customResetMode === mode && (
                            <motion.div
                              layoutId="reset-mode-indicator"
                              className="absolute inset-0 bg-elevated rounded-full border border-primary"
                              transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                            />
                          )}
                          <span className={cn(
                            'relative z-10',
                            data.customResetMode === mode ? 'text-text-primary' : 'text-text-secondary',
                          )}>
                            {mode === 'daily' ? '每日' : '每周'}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              <HiddenSection
                hiddenItems={hiddenItems}
                activeTab={activeTab}
                onShowItem={showItem}
                onDelete={deleteItem}
                confirmDelete={confirmDelete}
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
                confirmDelete={confirmDelete}
                customName={data.customName}
              />
            </div>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  )
}

export default App

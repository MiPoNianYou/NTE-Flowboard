import { useMemo, useEffect, useCallback } from 'react'
import { cn } from './utils/cn'
import { useChecklist } from './hooks/useChecklist'
import { useSupabaseSync } from './hooks/useSupabaseSync'
import { useTabManagement } from './hooks/useTabManagement'
import { useLayoutManagement } from './hooks/useLayoutManagement'
import { useSettings } from './hooks/useSettings'

import { useNextResetLabel } from './hooks/useNextResetLabel'
import { setStorageErrorHandler } from './utils/storage'
import { cleanupRegistry } from './utils/tagColors'
import { injectColorTokens, pageGradient } from './utils/colors'
import { TabSwitch } from './components/TabSwitch'
import { ProgressCard } from './components/ProgressCard'
import { HiddenSection } from './components/HiddenSection'
import { ChecklistPanel } from './components/ChecklistPanel'
import { AddItemForm } from './components/AddItemForm'
import { CustomSettings } from './components/CustomSettings'
import { Header } from './components/Header'
import { ErrorBoundary } from './components/ErrorBoundary'
import { OfflineIndicator } from './components/OfflineIndicator'
import { StorageToast, showStorageToast } from './components/StorageToast'

function App() {
  const { layout, toggleLayout, isLayoutTransitioning } = useLayoutManagement()

  useEffect(() => {
    setStorageErrorHandler((error, context) => {
      showStorageToast(`${context}：${error.message}`)
    })
    return () => setStorageErrorHandler(null)
  }, [])

  useEffect(() => {
    injectColorTokens()
  }, [])

  const {
    autoMoveCompleted, onAutoMoveCompletedChange,
    confirmDelete, onConfirmDeleteChange,
    cloudSyncBehavior, onCloudSyncBehaviorChange,
    showCustomTab, onShowCustomTabChange,
  } = useSettings()

  const { setActiveTab, effectiveActiveTab, setPreviousTab } = useTabManagement(showCustomTab)

  const handleSettingsImport = useCallback((settings: { autoMoveCompleted: boolean; confirmDelete: boolean; showCustomTab?: boolean }) => {
    onAutoMoveCompletedChange(settings.autoMoveCompleted)
    onConfirmDeleteChange(settings.confirmDelete)
    if (settings.showCustomTab !== undefined) {
      onShowCustomTabChange(settings.showCustomTab)
    }
  }, [onAutoMoveCompletedChange, onConfirmDeleteChange, onShowCustomTabChange])

  // 切换到自定义清单时，记住当前 tab
  useEffect(() => {
    if (effectiveActiveTab === 'daily' || effectiveActiveTab === 'weekly') {
      setPreviousTab(effectiveActiveTab)
    }
  }, [effectiveActiveTab, setPreviousTab])

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
    settings: { autoMoveCompleted, confirmDelete, showCustomTab },
  })

  const currentItems = useMemo(() => data[effectiveActiveTab], [data, effectiveActiveTab])
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

  const nextResetLabel = useNextResetLabel({
    activeTab: effectiveActiveTab,
    resetConfig: data.resetConfig,
    customResetMode: data.customResetMode,
  })

  return (
    <ErrorBoundary>
        <div className="relative min-h-screen flex flex-col transition-colors duration-150"
          style={{
            background: pageGradient(),
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
              showCustomTab,
              onShowCustomTabChange,
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
              <TabSwitch activeTab={effectiveActiveTab} onTabChange={setActiveTab} customName={data.customName} showCustomTab={showCustomTab} />
              <AddItemForm tab={effectiveActiveTab} onAdd={addItem} />
              <ProgressCard
                activeTab={effectiveActiveTab}
                completedCount={completedCount}
                totalCount={totalCount}
                allDone={allDone}
                nextResetLabel={nextResetLabel}
                layout={layout}
                customName={data.customName}
              />
              <HiddenSection
                hiddenItems={hiddenItems}
                activeTab={effectiveActiveTab}
                onShowItem={showItem}
                onDelete={deleteItem}
                confirmDelete={confirmDelete}
              />
              {effectiveActiveTab === 'custom' && (
                <CustomSettings
                  customName={data.customName}
                  onCustomNameChange={setCustomName}
                  customResetMode={data.customResetMode}
                  onCustomResetModeChange={setCustomResetMode}
                  isLayoutTransitioning={isLayoutTransitioning}
                />
              )}
            </div>
            <div
              className={cn(
                'min-w-0 w-full',
                layout === 'two-column' && 'md:flex-1 md:sticky md:top-8 lg:top-10',
              )}
            >
              <ChecklistPanel
                visibleItems={visibleItems}
                activeTab={effectiveActiveTab}
                autoMoveCompleted={autoMoveCompleted}
                isLayoutTransitioning={isLayoutTransitioning}
                onToggle={toggleItem}
                onEdit={editItem}
                onDelete={deleteItem}
                onHide={hideItem}
                onReorder={reorderItems}
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

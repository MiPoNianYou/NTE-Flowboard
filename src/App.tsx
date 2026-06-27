import { useMemo, useEffect } from 'react'
import { cn } from './utils/cn'
import { useChecklist } from './hooks/useChecklist'
import { useSupabaseSync } from './hooks/useSupabaseSync'
import { useTabManagement } from './hooks/useTabManagement'
import { useLocalStorageBoolean } from './hooks/useLocalStorageBoolean'
import { SettingsProvider, useSettings } from './context/SettingsContext'

import { useNextResetLabel } from './hooks/useNextResetLabel'
import { setStorageErrorHandler } from './utils/storage'
import { cleanupRegistry } from './utils/tagColors'
import { injectColorTokens, pageGradient } from './utils/colors'
import { TabSwitch } from './components/TabSwitch'
import { ProgressCard } from './components/ProgressCard'
import { HiddenSection } from './components/HiddenSection'
import { ChecklistPanel } from './components/ChecklistPanel'
import { AddItemForm } from './components/AddItemForm'
import { Header } from './components/Header'
import { ErrorBoundary } from './components/base/ErrorBoundary'
import { StorageToast, showStorageToast } from './components/StorageToast'
import { Badge } from './components/base/Badge'

function AppContent() {
  const { value: isHiddenSectionOpen, onChange: setIsHiddenSectionOpen } = useLocalStorageBoolean(
    'flowboard-hidden-section-open',
  )

  useEffect(() => {
    setStorageErrorHandler((error, context) => {
      showStorageToast(`${context}：${error.message}`)
    })
    return () => setStorageErrorHandler(null)
  }, [])

  useEffect(() => {
    injectColorTokens()
  }, [])

  const { settings, updateSettings } = useSettings()

  const { setActiveTab, activeTab, direction } = useTabManagement()

  const {
    data,
    toggleItem,
    addItem,
    editItem,
    removeItem,
    hideItem,
    showItem,
    reorderItem,
    manualReset,
    importFullData,
  } = useChecklist(settings)

  useEffect(() => {
    const allTags = [...data.daily, ...data.weekly, ...data.monthly].flatMap((item) => item.tags)
    cleanupRegistry(allTags)
  }, [data])

  const supabaseSync = useSupabaseSync({
    data,
    onDataImport: importFullData,
    onSettingsImport: updateSettings,
    includeSettings: true,
    settings,
  })

  const currentItems = useMemo(() => data[activeTab], [data, activeTab])
  const visibleItems = useMemo(() => currentItems.filter((item) => !item.isHidden), [currentItems])
  const hiddenItems = useMemo(() => currentItems.filter((item) => item.isHidden), [currentItems])
  const { completedCount, totalCount, isAllDone } = useMemo(() => {
    const completed = visibleItems.filter((item) => item.isCompleted).length
    const total = visibleItems.length
    return {
      completedCount: completed,
      totalCount: total,
      isAllDone: total > 0 && completed === total,
    }
  }, [visibleItems])

  const nextResetLabel = useNextResetLabel({
    activeTab: activeTab,
    serverRegion: settings.serverRegion,
  })

  const cloudSyncProps = useMemo(
    () => ({
      syncStatus: supabaseSync.syncStatus,
      lastSyncTime: supabaseSync.lastSyncTime,
      syncError: supabaseSync.syncError,
      isConfigured: supabaseSync.isConfigured,
      onSetupSupabase: supabaseSync.setupSupabase,
      onTriggerSync: supabaseSync.triggerSync,
      onTeardownSupabase: supabaseSync.teardownSupabase,
      onClearSyncError: supabaseSync.clearSyncError,
    }),
    [
      supabaseSync.syncStatus,
      supabaseSync.lastSyncTime,
      supabaseSync.syncError,
      supabaseSync.isConfigured,
      supabaseSync.setupSupabase,
      supabaseSync.triggerSync,
      supabaseSync.teardownSupabase,
      supabaseSync.clearSyncError,
    ],
  )

  return (
    <>
      <StorageToast />

      <div
        className="relative min-h-[100dvh] flex flex-col transition-colors duration-[480ms] page-gradient"
        style={{
          background: pageGradient(),
        }}
      >
        <div className="relative max-w-lg md:max-w-[1280px] mx-auto px-6 py-8 sm:py-12 md:py-10 flex-1 w-full">
          <Header
            data={data}
            onManualReset={manualReset}
            onImport={importFullData}
            cloudSyncProps={cloudSyncProps}
          />

          <div
            className={cn('flex flex-col gap-6 items-start', 'md:flex-row md:flex-wrap lg:gap-8')}
          >
            <div className={cn('space-y-4 w-full', 'md:space-y-5', 'md:w-[280px] lg:w-[320px]')}>
              <TabSwitch activeTab={activeTab} onTabChange={setActiveTab} />
              <AddItemForm tab={activeTab} onAdd={addItem} />
              <ProgressCard
                activeTab={activeTab}
                completedCount={completedCount}
                totalCount={totalCount}
                isAllDone={isAllDone}
                nextResetLabel={nextResetLabel}
              />
              <HiddenSection
                hiddenItems={hiddenItems}
                activeTab={activeTab}
                direction={direction}
                onShowItem={showItem}
                onDelete={removeItem}
                shouldConfirmDelete={settings.shouldConfirmDelete}
                isOpen={isHiddenSectionOpen}
                onToggle={() => setIsHiddenSectionOpen(!isHiddenSectionOpen)}
              />
            </div>
            <div className={cn('min-w-0 w-full', 'md:flex-1 md:sticky md:top-8 lg:top-10')}>
              <ChecklistPanel
                visibleItems={visibleItems}
                activeTab={activeTab}
                direction={direction}
                isAutoMoveEnabled={settings.isAutoMoveEnabled}
                onToggle={toggleItem}
                onEdit={editItem}
                onDelete={removeItem}
                onHide={hideItem}
                onReorder={reorderItem}
                shouldConfirmDelete={settings.shouldConfirmDelete}
                emptyAction={<Badge variant="primary">在左侧添加第一个任务</Badge>}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <SettingsProvider>
        <AppContent />
      </SettingsProvider>
    </ErrorBoundary>
  )
}

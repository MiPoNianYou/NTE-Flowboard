import { useMemo, useEffect } from 'react'
import { useChecklist } from './hooks/useChecklist'
import { useCloudSyncProps } from './hooks/useCloudSyncProps'
import { useTabManagement } from './hooks/useTabManagement'
import { useLocalStorageBoolean } from './hooks/useLocalStorageBoolean'
import { useIsMobile } from './hooks/useIsMobile'
import { SettingsContext } from './context/SettingsContext'

import { useNextResetLabel } from './hooks/useNextResetLabel'
import { cleanupRegistry } from './utils/tagColors'
import { injectColorTokens, PAGE_GRADIENT } from './utils/colors'
import { TabSwitch } from './components/TabSwitch'
import { ProgressCard } from './components/ProgressCard'
import { HiddenSection } from './components/HiddenSection'
import { ChecklistPanel } from './components/ChecklistPanel'
import { AddItemForm } from './components/AddItemForm'
import { Header } from './components/Header'
import { ErrorBoundary } from './components/base/ErrorBoundary'
import { StorageToast } from './components/StorageToast'
import { Badge } from './components/base/Badge'

function AppContent() {
  const { value: isHiddenSectionOpen, onChange: setIsHiddenSectionOpen } = useLocalStorageBoolean(
    'flowboard-hidden-section-open',
  )

  useEffect(() => {
    injectColorTokens()
  }, [])

  const {
    data,
    settings,
    updateSettings,
    uiPreferences,
    updateUiPreferences,
    toggleItem,
    addItem,
    editItem,
    removeItem,
    hideItem,
    showItem,
    reorderItem,
    manualReset,
    importFullData,
  } = useChecklist()

  useEffect(() => {
    const allTags = [...data.daily, ...data.weekly, ...data.monthly].flatMap((item) => item.tags)
    cleanupRegistry(allTags)
  }, [data])

  const cloudSyncProps = useCloudSyncProps({
    data,
    onDataImport: importFullData,
  })

  const { setActiveTab, activeTab, direction } = useTabManagement()
  const isMobile = useIsMobile()

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

  return (
    <SettingsContext.Provider
      value={{ settings, updateSettings, uiPreferences, updateUiPreferences }}
    >
      <StorageToast />

      <div
        className="relative min-h-[100dvh] flex flex-col transition-colors duration-[480ms] page-gradient"
        style={{
          background: PAGE_GRADIENT,
        }}
      >
        <div className="relative max-w-lg md:max-w-[1280px] mx-auto px-6 py-8 sm:py-12 md:py-10 flex-1 w-full">
          <Header
            data={data}
            onManualReset={manualReset}
            onImport={importFullData}
            cloudSyncProps={cloudSyncProps}
          />

          {isMobile ? (
            <div className="flex flex-col gap-4">
              <TabSwitch activeTab={activeTab} onTabChange={setActiveTab} />
              <ProgressCard
                activeTab={activeTab}
                completedCount={completedCount}
                totalCount={totalCount}
                isAllDone={isAllDone}
                nextResetLabel={nextResetLabel}
              />
              <AddItemForm tab={activeTab} onAdd={addItem} />
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
          ) : (
            <div className="flex flex-row gap-6 items-start lg:gap-8">
              <div className="space-y-5 w-[280px] lg:w-[320px]">
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
              <div className="flex-1 sticky top-8 lg:top-10 min-w-0">
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
          )}
        </div>
      </div>
    </SettingsContext.Provider>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  )
}

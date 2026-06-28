import { useCallback, useRef, useEffect } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Eye, Trash2 } from 'lucide-react'
import type { ChecklistItem, TabType } from '../types'
import type { TabDirection } from '../hooks/useTabManagement'
import { usePendingDelete } from '../hooks/usePendingDelete'
import { useHiddenSectionAnimation } from '../hooks/useHiddenSectionAnimation'
import { cn } from '../utils/cn'
import { ITEM_ENTRY, ITEM_EXIT, ENTRY } from '../utils/motion'
import {
  ACTION_HOVER_WARNING,
  ACTION_HOVER_DANGER,
  PENDING_DELETE_STYLE,
} from '../utils/stylePresets'
import { TagPill } from './TagPill'
import { Button } from './base/Button'
import { CollapsibleSection } from './base/CollapsibleSection'

interface HiddenSectionProps {
  hiddenItems: ChecklistItem[]
  activeTab: TabType
  direction: TabDirection
  onShowItem: (tab: TabType, id: string) => void
  onDelete: (tab: TabType, id: string) => void
  shouldConfirmDelete: boolean
  isOpen: boolean
  onToggle: () => void
}

export function HiddenSection({
  hiddenItems,
  activeTab,
  direction,
  onShowItem,
  onDelete,
  shouldConfirmDelete,
  isOpen,
  onToggle,
}: HiddenSectionProps) {
  const isVisible = hiddenItems.length > 0
  const isMountedRef = useRef(false)
  useEffect(() => {
    isMountedRef.current = true
  }, [])
  const {
    frameOpacity,
    headerOpacity,
    shouldHide,
    showContent,
    onFrameEnter,
    onContentExit,
    onFrameExit,
  } = useHiddenSectionAnimation(isVisible)
  const { handleDelete, isPending } = usePendingDelete(
    shouldConfirmDelete,
    useCallback((id: string) => onDelete(activeTab, id), [onDelete, activeTab]),
  )

  return (
    <motion.div
      initial={false}
      animate={{ opacity: frameOpacity }}
      transition={{ duration: 0.3 }}
      onAnimationComplete={frameOpacity === 1 ? onFrameEnter : onFrameExit}
    >
      <CollapsibleSection
        label={`隐藏任务 (${hiddenItems.length})`}
        variant="surface"
        isOpen={isOpen}
        onToggle={onToggle}
        headerOpacity={headerOpacity}
        className={shouldHide ? 'hidden' : undefined}
      >
        <AnimatePresence mode="wait" initial={false} onExitComplete={onContentExit}>
          {showContent && (
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: direction === 'down' ? -16 : 16 }}
              animate={{ opacity: 1, y: 0, transition: ENTRY }}
              exit={{ height: 0, transition: { duration: 0.3 } }}
            >
              <AnimatePresence>
                {hiddenItems.map((item) => (
                  <motion.div
                    key={item.id}
                    initial={isMountedRef.current ? { opacity: 0, height: 0 } : false}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0, transition: ITEM_EXIT }}
                    transition={ITEM_ENTRY}
                    className="overflow-hidden"
                  >
                    <div className="flex items-center justify-end gap-1 px-4 py-2 border-t border-border">
                      <span className="flex-1 text-xs text-text-primary truncate">{item.text}</span>
                      {item.tags && item.tags.length > 0 && (
                        <div className="flex gap-1">
                          {item.tags.map((tag) => (
                            <TagPill key={tag} tag={tag} suppressMountAnimation />
                          ))}
                        </div>
                      )}
                      <Button
                        variant="tertiary"
                        onClick={() => onShowItem(activeTab, item.id)}
                        className={ACTION_HOVER_WARNING}
                      >
                        <Eye size={15} />
                      </Button>
                      <Button
                        variant="tertiary"
                        onClick={() => handleDelete(item.id)}
                        className={cn(
                          ACTION_HOVER_DANGER,
                          isPending(item.id) && PENDING_DELETE_STYLE,
                        )}
                      >
                        <Trash2 size={15} />
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </CollapsibleSection>
    </motion.div>
  )
}

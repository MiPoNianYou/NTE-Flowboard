import { useCallback } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Eye, Trash2 } from 'lucide-react'
import type { ChecklistItem, TabType } from '../types'
import { usePendingDelete } from '../hooks/usePendingDelete'
import { cn } from '../utils/cn'
import { TagPill } from './TagPill'
import { Button } from './base/Button'
import { CollapsibleSection } from './base/CollapsibleSection'

interface HiddenSectionProps {
  hiddenItems: ChecklistItem[]
  activeTab: TabType
  onShowItem: (tab: TabType, order: number) => void
  onDelete: (tab: TabType, order: number) => void
  confirmDelete: boolean
}

export function HiddenSection({
  hiddenItems,
  activeTab,
  onShowItem,
  onDelete,
  confirmDelete,
}: HiddenSectionProps) {
  const { handleDelete, isPending } = usePendingDelete(
    confirmDelete,
    useCallback((order: number) => onDelete(activeTab, order), [onDelete, activeTab]),
  )

  if (hiddenItems.length === 0) return null

  return (
    <CollapsibleSection
      label={`隐藏事项 (${hiddenItems.length})`}
      variant="surface"
    >
      <AnimatePresence initial={false}>
        {hiddenItems.map((item) => (
          <motion.div
            key={item.order}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden"
          >
            <div className="flex items-center justify-end gap-1 px-4 py-2 border-t border-border">
              <span className="flex-1 text-xs text-text-primary truncate">
                {item.text}
              </span>
              {item.tags && item.tags.length > 0 && (
                <div className="flex gap-1">
                  {item.tags.map((tag) => (
                    <TagPill key={tag} tag={tag} />
                  ))}
                </div>
              )}
              <Button
                variant="tertiary"
                onClick={() => onShowItem(activeTab, item.order)}
                className="p-1.5 hover:bg-warning-soft hover:text-warning"
              >
                <Eye size={15} />
              </Button>
              <Button
                variant="tertiary"
                onClick={() => handleDelete(item.order)}
                className={cn(
                  'p-1.5 hover:bg-danger-soft hover:text-danger',
                  isPending(item.order)
                    ? 'text-white bg-danger hover:bg-danger hover:text-white'
                    : '',
                )}
              >
                <Trash2 size={15} />
              </Button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
      </CollapsibleSection>
  )
}

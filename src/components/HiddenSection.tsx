import { useState, memo } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { ChevronRight } from 'lucide-react'
import type { ChecklistItem, TabType } from '../types'
import { TagPill } from './TagPill'

interface HiddenSectionProps {
  hiddenItems: ChecklistItem[]
  activeTab: TabType
  onShowItem: (tab: TabType, order: number) => void
}

export const HiddenSection = memo(function HiddenSection({
  hiddenItems,
  activeTab,
  onShowItem,
}: HiddenSectionProps) {
  const [showHidden, setShowHidden] = useState(false)

  if (hiddenItems.length === 0) return null

  return (
    <div className="bg-white/40 dark:bg-gray-800/20 backdrop-blur-sm rounded-2xl border border-gray-200/40 dark:border-gray-700/20 overflow-hidden transition-colors duration-200">
      <button
        onClick={() => setShowHidden((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 hover:bg-white/30 dark:hover:bg-gray-700/20 transition-colors"
      >
        <span>隐藏事项 ({hiddenItems.length})</span>
        <ChevronRight
          size={16}
          className={`transition-transform duration-200 ${showHidden ? 'rotate-90' : ''}`}
        />
      </button>
      <AnimatePresence initial={false}>
        {showHidden &&
          hiddenItems.map((item) => (
            <motion.div
              key={item.order}
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
              className="overflow-hidden"
            >
              <div className="flex items-center gap-3 px-4 py-2.5 border-t border-gray-200/40 dark:border-gray-700/20">
                <span className="flex-1 text-xs text-gray-600 dark:text-gray-300 truncate">
                  {item.text}
                </span>
                {item.tags && item.tags.length > 0 && (
                  <div className="flex gap-1">
                    {item.tags.map((tag) => (
                      <TagPill key={tag} tag={tag} />
                    ))}
                  </div>
                )}
                <button
                  onClick={() => onShowItem(activeTab, item.order)}
                  className="px-2.5 py-1 rounded-lg text-xs text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-all font-medium hover:scale-105 active:scale-[0.97]"
                >
                  恢复
                </button>
              </div>
            </motion.div>
          ))}
      </AnimatePresence>
    </div>
  )
})

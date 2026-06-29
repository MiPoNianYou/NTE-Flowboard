import { useState, useRef, type FormEvent } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Plus } from 'lucide-react'
import type { TabType } from '../types'
import { Button } from './base/Button'
import { Card } from './base/Card'
import { TagInput } from './TagInput'
import { UI } from '../utils/constants'
import { SPRING } from '../utils/motion'
import { useComposition } from '../hooks/useComposition'

interface AddItemFormProps {
  tab: TabType
  onAdd: (tab: TabType, text: string, tags: string[]) => void
}

export function AddItemForm({ tab, onAdd }: AddItemFormProps) {
  const [text, setText] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isComposing, setIsComposing] = useState(false)
  const mainInputRef = useRef<HTMLInputElement>(null)
  const { onCompositionStart, onCompositionEnd } = useComposition()

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (text.trim()) {
      onAdd(tab, text.trim(), tags)
      setText('')
      setTags([])
      setIsFormOpen(false)
    }
  }

  return (
    <AnimatePresence mode="wait" initial={false}>
      {!isFormOpen ? (
        <motion.div
          key="trigger"
          initial={{ opacity: 0, scale: 0.95, height: 0 }}
          animate={{ opacity: 1, scale: 1, height: 'auto' }}
          exit={{ opacity: 0, scale: 0.95, height: 0 }}
          transition={SPRING}
          className=""
        >
          <Card
            variant="surface"
            className="cursor-pointer"
            onClick={() => setIsFormOpen(true)}
            role="button"
            tabIndex={0}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                setIsFormOpen(true)
              }
            }}
          >
            <div className="flex items-center justify-center gap-2 py-3 lg:py-3">
              <Plus size={16} className="lg:hidden text-text-muted" />
              <Plus size={20} className="hidden lg:block text-text-muted" />
              <span className="text-sm font-medium text-text-secondary">添加新任务</span>
            </div>
          </Card>
        </motion.div>
      ) : (
        <motion.form
          key="form"
          initial={{ opacity: 0, scale: 0.95, height: 0 }}
          animate={{ opacity: 1, scale: 1, height: 'auto' }}
          exit={{ opacity: 0, scale: 0.95, height: 0 }}
          transition={SPRING}
          onSubmit={handleSubmit}
          onKeyDown={(event) => {
            if (event.key === 'Escape' && !isComposing) {
              setText('')
              setTags([])
              setIsFormOpen(false)
            }
          }}
          className="space-y-2"
        >
          <Card variant="surface" isComposing={isComposing}>
            <input
              ref={mainInputRef}
              type="text"
              value={text}
              onChange={(event) => setText(event.target.value)}
              onCompositionStart={() => {
                onCompositionStart()
                setIsComposing(true)
              }}
              onCompositionEnd={() => {
                onCompositionEnd()
                setIsComposing(false)
              }}
              autoFocus
              placeholder="输入任务名称..."
              className="w-full px-3 py-2 bg-transparent text-sm text-text-primary outline-none placeholder-text-muted border-b border-border"
            />
            <div className="flex items-center flex-wrap gap-1.5 px-3 py-2 border-t border-border">
              <TagInput
                tags={tags}
                onChange={setTags}
                onCompositionChange={setIsComposing}
                limit={UI.TAG_LIMIT}
              />
            </div>
            <div className="flex gap-2 p-3 border-t border-border">
              <Button type="submit" disabled={!text.trim()} className="flex-1">
                添加
              </Button>
              <Button
                type="button"
                variant="tertiary"
                onClick={() => {
                  setText('')
                  setTags([])
                  setIsFormOpen(false)
                }}
              >
                取消
              </Button>
            </div>
          </Card>
        </motion.form>
      )}
    </AnimatePresence>
  )
}

import { useState, useRef, useEffect, type FormEvent } from 'react'
import { motion } from 'motion/react'
import { Plus } from 'lucide-react'
import type { TabType } from '../types'
import { Button } from './base/Button'
import { TagInput } from './TagInput'
import { UI } from '../utils/constants'
import { APPLE_EASE } from '../utils/motion'
import { useComposition } from '../hooks/useComposition'
import { useMeasuredHeight } from '../hooks/useMeasuredHeight'

interface AddItemFormProps {
  tab: TabType
  onAdd: (tab: TabType, text: string, tags: string[]) => void
}

const MORPH = { duration: 0.55, ease: APPLE_EASE }

export function AddItemForm({ tab, onAdd }: AddItemFormProps) {
  const [text, setText] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isComposing, setIsComposing] = useState(false)
  const mainInputRef = useRef<HTMLInputElement>(null)
  const { onCompositionStart, onCompositionEnd } = useComposition()
  const [formRef, formHeight] = useMeasuredHeight<HTMLDivElement>(0)

  const containerHeight = isFormOpen ? (formHeight ?? 'auto') : 'auto'

  useEffect(() => {
    if (isFormOpen) mainInputRef.current?.focus()
  }, [isFormOpen])

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (text.trim()) {
      onAdd(tab, text.trim(), tags)
      setText('')
      setTags([])
      setIsFormOpen(false)
    }
  }

  const handleClose = () => {
    setText('')
    setTags([])
    setIsFormOpen(false)
  }

  return (
    <motion.div
      animate={{ height: containerHeight }}
      transition={MORPH}
      style={{ position: 'relative', overflow: 'hidden' }}
      className="bg-surface rounded-xl border border-border shadow-card"
    >
      <motion.div
        initial={false}
        animate={{ opacity: isFormOpen ? 0 : 1, filter: isFormOpen ? 'blur(4px)' : 'blur(0px)' }}
        transition={MORPH}
        style={isFormOpen ? { position: 'absolute', top: 0, left: 0, width: '100%' } : {}}
        aria-hidden={isFormOpen}
        className={isFormOpen ? 'pointer-events-none' : ''}
      >
        <button type="button" className="w-full cursor-pointer" onClick={() => setIsFormOpen(true)}>
          <div className="flex items-center justify-center gap-2 py-3 lg:py-3">
            <Plus size={16} className="lg:hidden text-text-muted" />
            <Plus size={20} className="hidden lg:block text-text-muted" />
            <span className="text-sm font-medium text-text-secondary">添加新任务</span>
          </div>
        </button>
      </motion.div>

      <motion.div
        ref={formRef}
        initial={false}
        animate={{ opacity: isFormOpen ? 1 : 0, filter: isFormOpen ? 'blur(0px)' : 'blur(4px)' }}
        transition={MORPH}
        style={{ position: 'absolute', top: 0, left: 0, width: '100%' }}
        aria-hidden={!isFormOpen}
        className={isFormOpen ? '' : 'pointer-events-none'}
      >
        <form
          onSubmit={handleSubmit}
          onKeyDown={(event) => {
            if (event.key === 'Escape' && !isComposing) handleClose()
          }}
        >
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
            tabIndex={isFormOpen ? 0 : -1}
            placeholder="输入任务名称..."
            className="w-full px-3 py-2 bg-transparent text-sm text-text-primary outline-none placeholder-text-muted border-b border-border"
          />
          <div className="flex items-center flex-wrap gap-1.5 px-3 py-2 border-b border-border">
            <TagInput
              tags={tags}
              onChange={setTags}
              onCompositionChange={setIsComposing}
              limit={UI.TAG_LIMIT}
            />
          </div>
          <div className="flex gap-2 p-3">
            <Button type="submit" disabled={!text.trim()} className="flex-1">
              添加
            </Button>
            <Button type="button" variant="tertiary" onClick={handleClose}>
              取消
            </Button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}

import { useEffect, useId, useRef, useState } from 'react'
import { ChevronDown, ClipboardCheck, ClipboardPlus, Database } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '../../utils/cn'
import { GRID_COLLAPSE } from '../../utils/stylePresets'

interface SqlCodeBlockProps {
  label: string
  copyLabel: string
  content: string
}

export function SqlCodeBlock({ label, copyLabel, content }: SqlCodeBlockProps) {
  const { t } = useTranslation()
  const [isExpanded, setIsExpanded] = useState(false)
  const [isCopied, setIsCopied] = useState(false)
  const contentId = useId()
  const copiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current)
    }
  }, [])

  const handleCopy = () => {
    navigator.clipboard.writeText(content)
    setIsCopied(true)
    if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current)
    copiedTimerRef.current = setTimeout(() => {
      setIsCopied(false)
      copiedTimerRef.current = null
    }, 2000)
  }

  return (
    <div className="cloud-sync-sql relative bg-surface rounded-control overflow-hidden">
      <div
        className={cn(
          'cloud-sync-sql__header flex min-h-11 items-center justify-between w-full',
          isExpanded && 'cloud-sync-sql__header--expanded',
        )}
      >
        <button
          type="button"
          onClick={() => setIsExpanded((expanded) => !expanded)}
          aria-expanded={isExpanded}
          aria-controls={contentId}
          className="flex min-h-11 min-w-0 flex-1 items-center gap-1.5 px-3 text-left text-xs text-text-muted font-medium font-mono focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/50"
        >
          <Database className="size-3" aria-hidden="true" />
          {label}
          <ChevronDown
            aria-hidden="true"
            className={cn('size-3 transition-transform duration-150', !isExpanded && '-rotate-90')}
          />
        </button>
        <button
          type="button"
          onClick={handleCopy}
          aria-label={isCopied ? t('common.copied') : copyLabel}
          className={cn(
            'mr-3 inline-flex items-center justify-center size-6 rounded-control border border-border transition-colors duration-200',
            isCopied
              ? 'bg-success/15 text-success'
              : 'text-text-muted hover:text-text-secondary hover:bg-surface-hover',
          )}
        >
          {isCopied ? (
            <ClipboardCheck className="size-3.5" aria-hidden="true" />
          ) : (
            <ClipboardPlus className="size-3.5" aria-hidden="true" />
          )}
        </button>
      </div>
      <div
        id={contentId}
        aria-hidden={!isExpanded}
        inert={!isExpanded}
        className={cn(GRID_COLLAPSE, isExpanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]')}
      >
        <div className="overflow-hidden">
          <pre className="cloud-sync-sql__body px-3 pb-3 pt-1 text-xs font-mono text-text-secondary leading-relaxed max-h-56 whitespace-pre-wrap break-words overflow-y-auto">
            {content}
          </pre>
        </div>
      </div>
    </div>
  )
}

import { type ReactNode, type KeyboardEvent, useRef, useEffect, useCallback, useId } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Button } from './base/Button'
import { Card } from './base/Card'

interface ConfirmDialogProps {
  open: boolean
  onCancel: () => void
  onConfirm: () => void
  icon: ReactNode
  iconBg: string
  title: string
  description: ReactNode
  confirmLabel: string
  confirmVariant?: 'danger' | 'warning'
}

export function ConfirmDialog({
  open,
  onCancel,
  onConfirm,
  icon,
  iconBg,
  title,
  description,
  confirmLabel,
  confirmVariant = 'danger',
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const confirmBtnRef = useRef<HTMLButtonElement>(null)
  const titleId = useId()

  useEffect(() => {
    if (open) {
      // 延迟到下一帧以确保 DOM 就绪
      const raf = requestAnimationFrame(() => confirmBtnRef.current?.focus())
      return () => cancelAnimationFrame(raf)
    }
  }, [open])

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onCancel()
        return
      }
      if (e.key === 'Tab') {
        const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        )
        if (!focusable?.length) return
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault()
            last.focus()
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault()
            first.focus()
          }
        }
      }
    },
    [onCancel],
  )
  return (
    <AnimatePresence mode="wait">
      {open && (
        <>
          <motion.div
            key="confirm-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute inset-0 z-20 bg-overlay"
            onClick={onCancel}
          />
          <motion.div
            key="confirm-dialog"
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.92, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none"
          >
            <Card
              ref={dialogRef}
              variant="elevated"
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              onKeyDown={handleKeyDown}
              className="relative w-full max-w-xs p-5 space-y-4 shadow-lg mx-4 pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex flex-col items-center text-center space-y-2">
                <div className={`p-2.5 rounded-full ${iconBg}`}>{icon}</div>
                <p id={titleId} className="text-sm font-semibold text-text-primary">{title}</p>
                <p className="text-xs text-text-secondary leading-relaxed">{description}</p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  onClick={onCancel}
                  className="flex-1"
                >
                  取消
                </Button>
                <Button
                  ref={confirmBtnRef}
                  variant={confirmVariant}
                  onClick={onConfirm}
                  className="flex-1"
                >
                  {confirmLabel}
                </Button>
              </div>
            </Card>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

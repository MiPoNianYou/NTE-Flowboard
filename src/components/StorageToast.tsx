import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { CircleAlert, TriangleAlert, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { MS } from '../utils/constants'
import { SPRING } from '../utils/motion'
import { Button } from './base/Button'
import { toastBus, type ToastPayload } from '../utils/toastBus'
import { subscribeLegacyStorageEvents } from '../utils/legacyStorageEvents'

interface ToastCardProps {
  toast: ToastPayload
  onDismiss: (id: number) => void
}

function ToastCard({ toast, onDismiss }: ToastCardProps) {
  const { t } = useTranslation()
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const startedAtRef = useRef(0)
  const remainingRef = useRef<number>(MS.TOAST_DISMISS)
  const pausedRef = useRef(false)
  const hoveredRef = useRef(false)
  const focusedRef = useRef(false)
  const dismiss = useCallback(() => onDismiss(toast.id), [onDismiss, toast.id])

  const scheduleDismiss = useCallback(() => {
    startedAtRef.current = Date.now()
    timerRef.current = setTimeout(dismiss, remainingRef.current)
  }, [dismiss])

  const pauseDismiss = useCallback(() => {
    if (pausedRef.current) return
    pausedRef.current = true
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
      remainingRef.current = Math.max(0, remainingRef.current - (Date.now() - startedAtRef.current))
    }
  }, [])

  const resumeDismiss = useCallback(() => {
    if (!pausedRef.current) return
    pausedRef.current = false
    scheduleDismiss()
  }, [scheduleDismiss])

  useEffect(() => {
    if (!pausedRef.current) scheduleDismiss()
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [scheduleDismiss])

  const Icon = toast.type === 'warning' ? TriangleAlert : CircleAlert
  const accentClass = toast.type === 'warning' ? 'text-warning' : 'text-danger'

  return (
    <motion.div
      layout
      role="status"
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 24 }}
      transition={SPRING}
      className="group pointer-events-auto relative flex items-start gap-3 rounded-panel border border-border/50 glass-strong p-4 shadow-glass"
      onMouseEnter={() => {
        hoveredRef.current = true
        pauseDismiss()
      }}
      onMouseLeave={() => {
        hoveredRef.current = false
        if (!focusedRef.current) resumeDismiss()
      }}
      onFocus={() => {
        focusedRef.current = true
        pauseDismiss()
      }}
      onBlur={(event) => {
        if (event.currentTarget.contains(event.relatedTarget as Node | null)) return
        focusedRef.current = false
        if (!hoveredRef.current) resumeDismiss()
      }}
    >
      <div className="flex size-10 shrink-0 self-center items-center justify-center rounded-control bg-surface">
        <Icon className={`size-5 ${accentClass}`} aria-hidden="true" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold leading-5 text-text-primary">{toast.title}</p>
        <p className="mt-0.5 text-sm leading-5 text-text-secondary">{toast.message}</p>
      </div>
      <Button
        variant="tertiary"
        onClick={dismiss}
        className="glass-strong absolute -left-2 -top-2 z-10 flex size-6 items-center justify-center rounded-full border border-border/50 p-0 text-text-muted opacity-0 shadow-sm transition-[background-color,opacity,color] group-hover:opacity-100 hover:bg-surface-hover hover:text-text-primary focus-visible:opacity-100 [@media(hover:none)]:opacity-100"
        aria-label={t('common.closeNotification')}
      >
        <X className="size-3.5" aria-hidden="true" />
      </Button>
    </motion.div>
  )
}

export function StorageToast() {
  const { t } = useTranslation()
  const [toasts, setToasts] = useState<ToastPayload[]>([])

  const addToast = useCallback((toast: ToastPayload) => {
    setToasts((prev) => [...prev, toast])
  }, [])

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }, [])

  useEffect(() => toastBus.subscribe(addToast), [addToast])
  useEffect(
    () =>
      subscribeLegacyStorageEvents((event) => {
        if (event === 'conflict') {
          toastBus.emit(t('storage.legacyConflict'), 'warning', t('storage.legacyConflictTitle'))
          return
        }
        toastBus.emit(
          t('storage.legacyMigrationFailed'),
          'warning',
          t('storage.legacyMigrationFailedTitle'),
        )
      }),
    [t],
  )

  return (
    <div
      className="pointer-events-none fixed right-4 top-4 z-[500] flex w-[min(360px,calc(100vw-2rem))] flex-col gap-2"
      role="region"
      aria-label={t('settings.nav.notifications')}
    >
      <AnimatePresence initial={false}>
        {[...toasts].reverse().map((toast) => (
          <ToastCard key={toast.id} toast={toast} onDismiss={dismissToast} />
        ))}
      </AnimatePresence>
    </div>
  )
}

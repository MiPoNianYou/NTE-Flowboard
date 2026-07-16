import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { AlertTriangle, X } from 'lucide-react'
import { MS } from '../utils/constants'
import { SPRING } from '../utils/motion'
import { Button } from './base/Button'
import { toastBus, type ToastPayload } from '../utils/toastBus'

export function StorageToast() {
  const [toasts, setToasts] = useState<ToastPayload[]>([])

  const addToast = useCallback((toast: ToastPayload) => {
    setToasts((prev) => [...prev, toast])
    setTimeout(() => {
      setToasts((prev) => prev.filter((existingToast) => existingToast.id !== toast.id))
    }, MS.TOAST_DISMISS)
  }, [])

  useEffect(() => {
    return toastBus.subscribe(addToast)
  }, [addToast])

  return (
    <div className="fixed bottom-4 right-4 z-[500] flex flex-col gap-2 max-w-sm">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={SPRING}
            className="flex items-start gap-3 px-4 py-3 rounded-xl glass border border-danger/30"
          >
            <AlertTriangle size={16} className="text-danger mt-0.5 flex-shrink-0" />
            <p className="text-sm text-danger flex-1">{toast.message}</p>
            <Button
              variant="tertiary"
              onClick={() =>
                setToasts((prev) => prev.filter((existingToast) => existingToast.id !== toast.id))
              }
              className="p-0 text-danger/60 hover:text-danger"
            >
              <X size={14} />
            </Button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}

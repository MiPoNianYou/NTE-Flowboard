import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { AlertTriangle, X } from 'lucide-react'
import { MS } from '../utils/constants'

interface Toast {
  id: number
  message: string
  type: 'error' | 'warning'
}

let toastId = 0
let toastListeners: Array<(toast: Toast) => void> = []

export function showStorageToast(message: string, type: 'error' | 'warning' = 'error'): void {
  const toast: Toast = { id: ++toastId, message, type }
  toastListeners.forEach((l) => l(toast))
}

export function StorageToast() {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((toast: Toast) => {
    setToasts((prev) => [...prev, toast])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== toast.id))
    }, MS.TOAST_DISMISS)
  }, [])

  useEffect(() => {
    toastListeners.push(addToast)
    return () => {
      toastListeners = toastListeners.filter((l) => l !== addToast)
    }
  }, [addToast])

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="flex items-start gap-3 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800/40 shadow-lg backdrop-blur-sm"
          >
            <AlertTriangle
              size={16}
              className="text-red-500 dark:text-red-400 mt-0.5 flex-shrink-0"
            />
            <p className="text-sm text-red-700 dark:text-red-300 flex-1">{toast.message}</p>
            <button
              onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
              className="text-red-400 hover:text-red-600 dark:hover:text-red-200 transition-colors flex-shrink-0"
            >
              <X size={14} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}

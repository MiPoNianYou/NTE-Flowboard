import { type ReactNode } from 'react'
import { motion } from 'motion/react'

interface ConfirmDialogProps {
  open: boolean
  onCancel: () => void
  onConfirm: () => void
  icon: ReactNode
  iconBg: string
  title: string
  description: string
  confirmLabel: string
  confirmColor: string
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
  confirmColor,
}: ConfirmDialogProps) {
  if (!open) return null

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="absolute inset-0 flex items-center justify-center z-20"
    >
      <div
        className="absolute inset-0 bg-black/20 backdrop-blur-sm"
        onClick={onCancel}
      />
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        className="relative w-full max-w-xs bg-white/95 dark:bg-gray-800/90 rounded-2xl p-5 space-y-4 border border-gray-200/50 dark:border-white/10 shadow-elevated mx-4"
      >
        <div className="flex flex-col items-center text-center space-y-2">
          <div className={`p-2.5 rounded-full ${iconBg}`}>{icon}</div>
          <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{title}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{description}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 py-2 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 transition-colors active:scale-[0.97]"
          >
            取消
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 py-2 rounded-xl text-sm font-medium text-white transition-colors active:scale-[0.97] ${confirmColor}`}
          >
            {confirmLabel}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

import { type ReactNode } from 'react'
import { motion } from 'motion/react'
import { ArrowLeft } from 'lucide-react'

interface SettingsSubPageProps {
  title: string
  onBack: () => void
  children: ReactNode
}

export function SettingsSubPage({ title, onBack, children }: SettingsSubPageProps) {
  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', stiffness: 350, damping: 35 }}
      className="absolute inset-0 flex flex-col bg-white/90 dark:bg-gray-900/95 backdrop-blur-xl z-10"
    >
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200/60 dark:border-white/10 flex-shrink-0">
        <button
          onClick={onBack}
          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100/60 dark:hover:bg-white/10 transition-colors active:scale-[0.97]"
        >
          <ArrowLeft className="size-5" />
        </button>
        <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100">{title}</h2>
      </div>
      <div className="flex-1 overflow-y-auto overscroll-contain">{children}</div>
    </motion.div>
  )
}

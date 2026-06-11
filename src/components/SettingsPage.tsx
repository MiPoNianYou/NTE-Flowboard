import type { ReactNode } from 'react'
import { motion } from 'motion/react'
import { NavBar } from './base/NavBar'

interface SettingsPageProps {
  title: string
  onBack?: () => void
  embedded?: boolean
  children: ReactNode
}

export function SettingsPage({ title, onBack, embedded, children }: SettingsPageProps) {
  if (embedded) return <>{children}</>

  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', stiffness: 350, damping: 35 }}
      className="absolute inset-0 flex flex-col bg-surface z-10"
    >
      <NavBar title={title} onBack={onBack!} />
      <div className="flex-1 overflow-y-auto overscroll-contain">{children}</div>
    </motion.div>
  )
}

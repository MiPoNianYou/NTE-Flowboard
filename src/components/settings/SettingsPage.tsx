import type { ReactNode } from 'react'
import { motion } from 'motion/react'
import { NavBar } from './NavBar'
import { SPRING } from '../../utils/motion'

export interface SettingsPageBaseProps {
  onBack?: () => void
  isEmbedded?: boolean
}

interface SettingsPageProps extends SettingsPageBaseProps {
  title: string
  children: ReactNode
}

export function SettingsPage({ title, onBack, isEmbedded, children }: SettingsPageProps) {
  if (isEmbedded) return <>{children}</>

  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={SPRING}
      className="absolute inset-0 flex flex-col bg-surface z-[100]"
    >
      <NavBar title={title} onBack={onBack ?? (() => {})} />
      <div className="flex-1 overflow-y-auto overscroll-contain">{children}</div>
    </motion.div>
  )
}

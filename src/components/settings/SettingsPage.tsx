import type { ReactNode } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { NavBar } from './NavBar'

const PAGE_TRANSITION = { duration: 0.22, ease: [0.2, 0.8, 0.2, 1] as const }
const REDUCED_MOTION = { duration: 0 }
const PAGE_REVEAL_FROM_RIGHT = 'inset(0 0 0 16px)'

export interface SettingsPageBaseProps {
  onBack?: () => void
  isEmbedded?: boolean
}

interface SettingsPageProps extends SettingsPageBaseProps {
  title: string
  children: ReactNode
}

export function SettingsPage({ title, onBack, isEmbedded, children }: SettingsPageProps) {
  const shouldReduceMotion = useReducedMotion()

  if (isEmbedded) return <>{children}</>

  return (
    <motion.div
      initial={{ opacity: 0, clipPath: PAGE_REVEAL_FROM_RIGHT }}
      animate={{ opacity: 1, clipPath: 'inset(0)' }}
      exit={{ opacity: 0, clipPath: PAGE_REVEAL_FROM_RIGHT }}
      transition={shouldReduceMotion ? REDUCED_MOTION : PAGE_TRANSITION}
      className="absolute inset-0 flex flex-col bg-surface z-[100]"
    >
      <NavBar title={title} onBack={onBack ?? (() => {})} />
      <div className="flex-1 overflow-y-auto overscroll-contain">{children}</div>
    </motion.div>
  )
}

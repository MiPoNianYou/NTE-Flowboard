import { motion } from 'motion/react'
import { useState, useEffect, useMemo } from 'react'
import { Counter } from './Counter'
import { SPRING, PAGE } from '../utils/motion'
import { useIsMobile } from '../hooks/useIsMobile'

interface ProgressRingProps {
  completed: number
  total: number
}

export function ProgressRing({ completed, total }: ProgressRingProps) {
  const percentage = total === 0 ? 0 : Math.round((completed / total) * 100)
  const circumference = 2 * Math.PI * 32
  const [hasMounted, setHasMounted] = useState(false)
  const isBelowDesktop = useIsMobile(1024)
  const counterFontSize = isBelowDesktop ? 12 : 15

  useEffect(() => {
    setHasMounted(true)
  }, [])

  const springTransition = useMemo(() => {
    if (!hasMounted) {
      return { duration: 0 }
    }
    return SPRING
  }, [hasMounted])

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={80} height={80} className="size-14 lg:size-20 -rotate-90" viewBox="0 0 80 80">
        <circle
          cx={40}
          cy={40}
          r={32}
          fill="none"
          stroke="currentColor"
          strokeWidth={5}
          className="text-border"
        />
        <motion.circle
          cx={40}
          cy={40}
          r={32}
          fill="none"
          stroke="currentColor"
          strokeWidth={5}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference * (1 - percentage / 100) }}
          animate={{ strokeDashoffset: circumference * (1 - percentage / 100) }}
          transition={percentage === 0 ? PAGE : springTransition}
          className={percentage === 100 ? 'text-success' : 'text-primary'}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center font-bold text-text-primary tabular-nums">
        <Counter
          value={percentage}
          fontSize={counterFontSize}
          gap={0}
          padding={0}
          horizontalPadding={0}
          textColor="currentColor"
          fontWeight={700}
          gradientHeight={0}
          suffix="%"
        />
      </span>
    </div>
  )
}

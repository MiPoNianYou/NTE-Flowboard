import { motion } from 'motion/react'
import { useRef, useEffect, useMemo } from 'react'

interface Props {
  completed: number
  total: number
}

export function ProgressRing({ completed, total }: Props) {
  const percentage = total === 0 ? 0 : Math.round((completed / total) * 100)
  const circumference = 2 * Math.PI * 32

  const hasMountedRef = useRef(false)

  useEffect(() => {
    hasMountedRef.current = true
  }, [])

  const springTransition = useMemo(() => {
    if (!hasMountedRef.current) {
      return { duration: 0 }
    }
    return { type: 'spring' as const, stiffness: 120, damping: 18 }
  }, [percentage])

  return (
    <div className="relative inline-flex items-center justify-center">
      {/* 移动端 64px / 桌面端 80px */}
      <svg width={80} height={80} className="size-14 lg:size-20 -rotate-90" viewBox="0 0 80 80">
        <circle
          cx={40}
          cy={40}
          r={32}
          fill="none"
          stroke="currentColor"
          strokeWidth={5}
          className="text-gray-200 dark:text-gray-700"
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
          animate={{ strokeDashoffset: circumference * (1 - percentage / 100) }}
          transition={springTransition}
          className={
            percentage === 100
              ? 'text-emerald-500 dark:text-emerald-400'
              : 'text-indigo-500 dark:text-indigo-400'
          }
        />
      </svg>
      <span className="absolute text-xs lg:text-sm font-bold text-gray-600 dark:text-gray-300 tabular-nums">
        {percentage}%
      </span>
    </div>
  )
}

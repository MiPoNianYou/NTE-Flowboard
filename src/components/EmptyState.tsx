import { type ReactNode, useMemo } from 'react'
import { motion } from 'motion/react'
import { STAGGER, APPLE_EASE } from '../utils/motion'

const fallbackSubtitles = [
  '没什么事做的话，要不要听听我的家族兴建大计？',
  '早上好！有新的委托吗？柯林斯家族随时可以出发！',
  '还早还早，再出去转一趟吧',
]

interface EmptyStateProps {
  title: string
  subtitle?: string
  action?: ReactNode
}

const floatTransition = {
  duration: 4,
  repeat: Infinity,
  ease: 'easeInOut' as const,
}

const rowVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: (index: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.3 + index * STAGGER, duration: 0.48, ease: APPLE_EASE },
  }),
}

export function EmptyState({ title, subtitle, action }: EmptyStateProps) {
  const displaySubtitle = useMemo(
    () => subtitle ?? fallbackSubtitles[Math.floor(Math.random() * fallbackSubtitles.length)],
    [subtitle],
  )
  return (
    <div className="flex flex-col items-center justify-center py-10 md:py-14 gap-4 text-text-muted">
      <div className="relative">
        <div className="absolute inset-0 -m-4 morph-blob bg-primary/5 blur-xl" />
        <motion.div animate={{ y: [-2, 2, -2] }} transition={floatTransition}>
          <svg
            width="112"
            height="96"
            viewBox="0 0 112 96"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <rect
              x="6"
              y="12"
              width="100"
              height="78"
              rx="12"
              className="fill-surface"
              stroke="currentColor"
              strokeWidth="1.2"
              strokeOpacity="0.3"
            />
            <rect
              x="30"
              y="2"
              width="52"
              height="16"
              rx="6"
              className="fill-elevated"
              stroke="currentColor"
              strokeWidth="1.2"
              strokeOpacity="0.3"
            />
            <rect x="46" y="5" width="20" height="10" rx="4" className="fill-border-strong" />

            <g opacity="0.5">
              <rect
                x="18"
                y="30"
                width="14"
                height="14"
                rx="4"
                className="fill-none"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeOpacity="0.35"
              />
              <rect
                x="38"
                y="35"
                width="42"
                height="4"
                rx="2"
                className="fill-border-strong"
                opacity="0.5"
              />
            </g>

            <g opacity="0.55">
              <rect
                x="18"
                y="50"
                width="14"
                height="14"
                rx="4"
                className="fill-none"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeOpacity="0.35"
              />
              <rect
                x="38"
                y="55"
                width="50"
                height="4"
                rx="2"
                className="fill-border-strong"
                opacity="0.5"
              />
            </g>

            <g opacity="0.4">
              <rect
                x="18"
                y="70"
                width="14"
                height="14"
                rx="4"
                className="fill-none"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeOpacity="0.35"
              />
              <rect
                x="38"
                y="75"
                width="34"
                height="4"
                rx="2"
                className="fill-border-strong"
                opacity="0.5"
              />
            </g>
          </svg>
        </motion.div>
      </div>

      <motion.div className="flex flex-col items-center gap-1" initial="hidden" animate="visible">
        <motion.p
          className="text-sm font-medium text-text-secondary"
          custom={0}
          variants={rowVariants}
        >
          {title}
        </motion.p>
        <motion.p className="text-xs text-text-muted" custom={1} variants={rowVariants}>
          {displaySubtitle}
        </motion.p>
        {action && (
          <motion.div custom={2} variants={rowVariants} className="mt-2">
            {action}
          </motion.div>
        )}
      </motion.div>
    </div>
  )
}

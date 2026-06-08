import { motion } from 'motion/react'

interface EmptyStateProps {
  title: string
  subtitle: string
}

const floatTransition = {
  duration: 4,
  repeat: Infinity,
  ease: 'easeInOut' as const,
}

const rowVariants = {
  hidden: { opacity: 0, x: -6 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: { delay: 0.3 + i * 0.1, duration: 0.35, ease: 'easeOut' as const },
  }),
}

export function EmptyState({ title, subtitle }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-10 md:py-14 gap-4 text-text-muted">
      <motion.div animate={{ y: [-2, 2, -2] }} transition={floatTransition}>
        <svg
          width="112"
          height="96"
          viewBox="0 0 112 96"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* 剪贴板主体 */}
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
          {/* 剪贴板顶部夹子 */}
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
          {/* 夹子高光 */}
          <rect
            x="46"
            y="5"
            width="20"
            height="10"
            rx="4"
            className="fill-border-strong"
          />

          {/* 第 1 行 - 未选中 */}
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

          {/* 第 2 行 - 未选中 */}
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

          {/* 第 3 行 - 未选中 */}
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

          {/* 第 1 行的微妙对勾 */}
          <motion.path
            d="M21 37l3.5 3.5 7-7"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="opacity-0"
            fill="none"
            animate={{ opacity: [0, 0.15, 0, 0.15] }}
            transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
          />
        </svg>
      </motion.div>

      <motion.div className="flex flex-col items-center gap-1" initial="hidden" animate="visible">
        <motion.p
          className="text-sm font-medium text-text-secondary"
          custom={0}
          variants={rowVariants}
        >
          {title}
        </motion.p>
        <motion.p
          className="text-xs text-text-muted"
          custom={1}
          variants={rowVariants}
        >
          {subtitle}
        </motion.p>
      </motion.div>
    </div>
  )
}

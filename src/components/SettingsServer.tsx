import { motion } from 'motion/react'
import { ArrowLeft } from 'lucide-react'
import type { ResetConfig, ServerRegion } from '../types'
import { SERVER_REGIONS } from '../utils/storage'
import { cn } from '../utils/cn'

interface SettingsServerProps {
  resetConfig: ResetConfig
  onResetConfigChange: (config: ResetConfig) => void
  onBack: () => void
}

const REGION_ICONS: Record<ServerRegion, string> = {
  asia: '🌏',
  america: '🌎',
  europe: '🌍',
}

export function SettingsServer({
  resetConfig,
  onResetConfigChange,
  onBack,
}: SettingsServerProps) {
  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', stiffness: 350, damping: 35 }}
      className="absolute inset-0 flex flex-col bg-white/90 dark:bg-gray-900/95 backdrop-blur-xl z-10"
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200/60 dark:border-white/10 flex-shrink-0">
        <button
          onClick={onBack}
          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100/60 dark:hover:bg-white/10 transition-colors active:scale-[0.97]"
        >
          <ArrowLeft className="size-5" />
        </button>
        <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100">服务器设置</h2>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto overscroll-contain p-5 space-y-4">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          选择你的游戏服务器，重置时间将自动适配服务器时区（含夏令时）
        </p>

        <div className="space-y-2">
          {(Object.entries(SERVER_REGIONS) as [ServerRegion, { label: string; description: string }][]).map(
            ([region, info]) => (
              <button
                key={region}
                onClick={() => onResetConfigChange({ serverRegion: region })}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-all active:scale-[0.98]',
                  resetConfig.serverRegion === region
                    ? 'bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-700/50'
                    : 'bg-gray-50/80 dark:bg-white/5 border border-gray-200/50 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/10',
                )}
              >
                <span className="text-xl">{REGION_ICONS[region]}</span>
                <div className="flex-1">
                  <p
                    className={cn(
                      'text-sm font-medium',
                      resetConfig.serverRegion === region
                        ? 'text-indigo-600 dark:text-indigo-400'
                        : 'text-gray-700 dark:text-gray-200',
                    )}
                  >
                    {info.label}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">{info.description}</p>
                </div>
                {resetConfig.serverRegion === region && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-5 h-5 rounded-full bg-indigo-500 flex items-center justify-center"
                  >
                    <svg
                      className="w-3 h-3 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={3}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </motion.div>
                )}
              </button>
            ),
          )}
        </div>

        <div className="bg-gray-50/80 dark:bg-white/5 rounded-xl border border-gray-200/50 dark:border-white/10 px-4 py-3">
          <p className="text-[11px] text-gray-400 dark:text-gray-500 leading-relaxed">
            每日重置 <span className="font-medium text-gray-500 dark:text-gray-400">5:00 AM</span>
            <br />
            每周一重置 <span className="font-medium text-gray-500 dark:text-gray-400">5:00 AM</span>
            <br />
            <span className="text-[10px]">按服务器时区，含夏令时自动调整</span>
          </p>
        </div>
      </div>
    </motion.div>
  )
}

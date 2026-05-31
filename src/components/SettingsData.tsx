import { motion } from 'motion/react'
import { ArrowLeft, Download, Upload } from 'lucide-react'

interface SettingsDataProps {
  onExport: () => void
  onImportFile: (e: React.ChangeEvent<HTMLInputElement>) => void
  fileInputRef: React.RefObject<HTMLInputElement | null>
  importError: string
  importSuccess: boolean
  onBack: () => void
}

export function SettingsData({
  onExport,
  onImportFile,
  fileInputRef,
  importError,
  importSuccess,
  onBack,
}: SettingsDataProps) {
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
        <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100">数据管理</h2>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto overscroll-contain p-5 space-y-4">
        <div className="space-y-2">
          <button
            onClick={onExport}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-emerald-50/80 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors active:scale-[0.98] text-sm font-medium border border-emerald-200/50 dark:border-emerald-700/30"
          >
            <Download className="size-4" />
            <div className="text-left">
              <p>导出数据</p>
              <p className="text-xs font-normal opacity-70">下载 JSON 文件备份当前数据</p>
            </div>
          </button>

          <label className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-blue-50/80 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors active:scale-[0.98] text-sm font-medium border border-blue-200/50 dark:border-blue-700/30 cursor-pointer">
            <Upload className="size-4" />
            <div className="text-left">
              <p>导入数据</p>
              <p className="text-xs font-normal opacity-70">从 JSON 文件恢复数据</p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={onImportFile}
              className="hidden"
            />
          </label>
        </div>

        {importError && (
          <p className="text-xs text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">
            {importError}
          </p>
        )}
        {importSuccess && (
          <p className="text-xs text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-2 rounded-lg">
            数据导入成功！
          </p>
        )}

        <div className="bg-gray-50/80 dark:bg-white/5 rounded-xl border border-gray-200/50 dark:border-white/10 px-4 py-3">
          <p className="text-[11px] text-gray-400 dark:text-gray-500 leading-relaxed">
            <span className="font-medium text-gray-500 dark:text-gray-400">提示：</span>
            导出的 JSON 文件包含你的清单数据和服务器设置。导入时会覆盖当前数据。
          </p>
        </div>
      </div>
    </motion.div>
  )
}

import { Download, Upload } from 'lucide-react'
import { SettingsSubPage } from './SettingsSubPage'

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
    <SettingsSubPage title="数据管理" onBack={onBack}>
      <div className="p-5 space-y-4">
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
    </SettingsSubPage>
  )
}

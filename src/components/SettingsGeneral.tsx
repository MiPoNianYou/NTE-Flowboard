import { SettingsPage } from './SettingsPage'
import { ToggleSwitch } from './base/ToggleSwitch'
import { SettingRow } from './base/SettingRow'

interface SettingsGeneralProps {
  autoMoveCompleted: boolean
  onAutoMoveCompletedChange: (newVal: boolean) => void
  confirmDelete: boolean
  onConfirmDeleteChange: (newVal: boolean) => void
  onBack?: () => void
  embedded?: boolean
}

export function SettingsGeneral({
  autoMoveCompleted,
  onAutoMoveCompletedChange,
  confirmDelete,
  onConfirmDeleteChange,
  onBack,
  embedded,
}: SettingsGeneralProps) {
  return (
    <SettingsPage title="通用" onBack={onBack} embedded={embedded}>
      <div className="p-5 space-y-4">
        {/* 行为设置 */}
        <div className="bg-surface rounded-lg border border-border p-4">
          <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-3 px-1">
            行为
          </p>
          <div className="space-y-3">
            <SettingRow
              label="完成事项自动移至底部"
              trailing={<ToggleSwitch checked={autoMoveCompleted} onCheckedChange={onAutoMoveCompletedChange} />}
            />
            <SettingRow
              label="删除前二次确认"
              trailing={<ToggleSwitch checked={confirmDelete} onCheckedChange={onConfirmDeleteChange} />}
            />
          </div>
        </div>
      </div>
    </SettingsPage>
  )
}

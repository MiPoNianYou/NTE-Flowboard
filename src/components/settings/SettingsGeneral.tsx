import { ListEnd, CheckCheck } from 'lucide-react'
import { SettingsPage } from './SettingsPage'
import { ToggleSwitch } from '../base/ToggleSwitch'
import { SettingRow } from './SettingRow'
import { Card } from '../base/Card'
import type { SettingsPageBaseProps } from './SettingsPage'
import { useSettings } from '../../context/SettingsContext'

export function SettingsGeneral({ onBack, isEmbedded }: SettingsPageBaseProps) {
  const { settings, updateSettings } = useSettings()

  return (
    <SettingsPage title="通用" onBack={onBack} isEmbedded={isEmbedded}>
      <div className="space-y-2">
        <Card variant="surface" className="p-0 overflow-hidden">
          <SettingRow
            icon={ListEnd}
            label="完成任务自动置底"
            trailing={
              <ToggleSwitch
                checked={settings.isAutoMoveEnabled}
                onCheckedChange={(value) => updateSettings({ isAutoMoveEnabled: value })}
              />
            }
            className="px-4 py-3"
          />
        </Card>
        <Card variant="surface" className="p-0 overflow-hidden">
          <SettingRow
            icon={CheckCheck}
            label="删除二次确认"
            trailing={
              <ToggleSwitch
                checked={settings.shouldConfirmDelete}
                onCheckedChange={(value) => updateSettings({ shouldConfirmDelete: value })}
              />
            }
            className="px-4 py-3"
          />
        </Card>
      </div>
    </SettingsPage>
  )
}

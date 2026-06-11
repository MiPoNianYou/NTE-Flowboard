import { useState, memo } from 'react'
import {
  Cloud,
  Eye,
  EyeOff,
  Loader2,
  LogOut,
} from 'lucide-react'
import type { SyncStatus } from '../types'
import { CARD_STYLES } from '../utils/styles'
import { cn } from '../utils/cn'
import { Button } from './base/Button'
import { Input } from './base/Input'
import { Card } from './base/Card'
import { StatusMessage } from './base/StatusMessage'
import { SettingRow } from './base/SettingRow'
import { IconBox } from './base/IconBox'
import { ToggleSwitch } from './base/ToggleSwitch'

interface CloudSyncSectionProps {
  syncStatus: SyncStatus
  lastSyncTime: string | null
  syncError: string | null
  isConfigured: boolean
  onSetupSupabase: (projectId: string, anonKey: string) => Promise<void>
  onTriggerSync: () => Promise<void>
  onRequestDisconnect: () => void
  cloudSyncBehavior: boolean
  onCloudSyncBehaviorChange: (value: boolean) => void
}

function formatSyncTime(isoString: string | null): string {
  if (!isoString) return '从未'
  try {
    const date = new Date(isoString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMin = Math.floor(diffMs / 60000)

    if (diffMin < 1) return '刚刚'
    if (diffMin < 60) return `${diffMin} 分钟前`
    const diffHour = Math.floor(diffMin / 60)
    if (diffHour < 24) return `${diffHour} 小时前`
    return date.toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return '未知'
  }
}

export const CloudSyncSection = memo(function CloudSyncSection({
  syncStatus,
  lastSyncTime,
  syncError,
  isConfigured,
  onSetupSupabase,
  onTriggerSync,
  onRequestDisconnect,
  cloudSyncBehavior,
  onCloudSyncBehaviorChange,
}: CloudSyncSectionProps) {
  const [projectIdInput, setProjectIdInput] = useState('')
  const [keyInput, setKeyInput] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)

  const isSyncingState = syncStatus === 'syncing'
  const isConfigError = syncError === '连接失败，请检查项目 ID 和 Key'

  const handleSetup = async () => {
    if (!projectIdInput.trim() || !keyInput.trim()) return
    setIsConnecting(true)
    setLocalError(null)
    try {
      await onSetupSupabase(projectIdInput.trim(), keyInput.trim())
    } catch {
      setLocalError('连接失败，请检查配置')
    } finally {
      setIsConnecting(false)
    }
  }

  const handleManualSync = async () => {
    setIsSyncing(true)
    try {
      await onTriggerSync()
    } finally {
      setIsSyncing(false)
    }
  }

  const statusText = (() => {
    if (isSyncingState || isSyncing) return '同步中'
    if (isConnecting) return '连接中'
    switch (syncStatus) {
      case 'connected':
        return '已连接'
      case 'error':
        return '同步错误'
      case 'disconnected':
        return '未连接'
      default:
        return '未连接'
    }
  })()

  // --- 未配置 ---
  if (!isConfigured) {
    return (
      <div className="space-y-3">
        <Card className="px-4 py-3">
          <p className="text-xs font-medium text-text-primary">
            通过 Supabase 在多设备间同步清单数据
          </p>
        </Card>
        <div className={CARD_STYLES.sectionSpaced}>
          <div className="space-y-3">
            <Input
              label="项目 ID"
              type="text"
              value={projectIdInput}
              onChange={(e) => setProjectIdInput(e.target.value)}
              placeholder="abcdefgh123456789xyz"
              autoComplete="off"
            />
            <Input
              label="Anon Key"
              type={showKey ? 'text' : 'password'}
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              placeholder="eyJhbGciOi..."
              autoComplete="off"
              icon={
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  aria-label={showKey ? '隐藏密钥' : '显示密钥'}
                >
                  {showKey ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                </button>
              }
            />
            {isConfigError && (
              <StatusMessage tone="danger">{syncError}</StatusMessage>
            )}
          </div>

          <Button
            onClick={handleSetup}
            disabled={!projectIdInput.trim() || !keyInput.trim()}
            loading={isConnecting}
            className="w-full justify-center"
          >
            <Cloud className="size-3.5" />
            连接 Supabase
          </Button>

          {(syncError || localError) && !isConfigError && (
            <StatusMessage tone="danger">{syncError || localError}</StatusMessage>
          )}
        </div>
      </div>
    )
  }

  // --- 已连接 ---
  return (
    <div>
      <div className={CARD_STYLES.sectionSpaced}>
        {/* 状态 */}
        <div className="flex items-center gap-3">
          <IconBox
            size="lg"
            variant={syncStatus === 'connected' ? 'success' : syncStatus === 'error' ? 'danger' : syncStatus === 'syncing' || syncStatus === 'connecting' ? 'info' : 'neutral'}
            icon={
              syncStatus === 'syncing' || syncStatus === 'connecting' ? <Loader2 className="size-5 animate-spin" />
              : <span className={cn(
                  'size-3 rounded-full',
                  syncStatus === 'connected' && 'bg-success',
                  syncStatus === 'error' && 'bg-danger',
                  syncStatus === 'disconnected' && 'bg-text-muted',
                )} />
            }
          />
          <div>
            <span className={cn(
              'text-xs font-medium',
              syncStatus === 'connected' && 'text-success',
              syncStatus === 'error' && 'text-danger',
              syncStatus === 'syncing' && 'text-info',
              syncStatus === 'connecting' && 'text-info',
              syncStatus === 'disconnected' && 'text-text-secondary',
            )}>
              {statusText}
            </span>
            <p className="text-[11px] text-text-secondary">
              上次同步: {formatSyncTime(lastSyncTime)}
            </p>
          </div>
        </div>

        {/* 错误 */}
        {syncError && <StatusMessage tone="danger">{syncError}</StatusMessage>}

        {/* 同步行为开关 */}
        <SettingRow
          label="同步行为设置"
          trailing={<ToggleSwitch checked={cloudSyncBehavior} onCheckedChange={onCloudSyncBehaviorChange} />}
        />

        {/* 操作 */}
        <div className="flex gap-2">
          <Button
            variant="primary-soft"
            onClick={handleManualSync}
            disabled={isSyncingState}
            loading={isSyncing}
            className="flex-1 justify-center"
          >
            <Cloud className="size-[15px]" />
            手动同步
          </Button>
          <Button
            variant="danger-soft"
            onClick={onRequestDisconnect}
            className="btn-disconnect justify-center"
          >
            <LogOut size={18} />
          </Button>
        </div>
      </div>
    </div>
  )
})

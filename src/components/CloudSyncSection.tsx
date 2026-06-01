import { useState, memo } from 'react'
import {
  Cloud,
  Loader2,
  Eye,
  EyeOff,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  Lock,
} from 'lucide-react'
import type { SyncStatus } from '../hooks/useSupabaseSync'
import { CARD_STYLES } from '../utils/styles'
import { MS } from '../utils/constants'

interface CloudSyncSectionProps {
  syncStatus: SyncStatus
  lastSyncTime: string | null
  syncError: string | null
  isConfigured: boolean
  isLocked: boolean
  onSetupSupabase: (projectId: string, anonKey: string, syncKey: string) => Promise<void>
  onUnlock: (syncKey: string) => Promise<boolean>
  onTriggerSync: () => Promise<void>
  onRequestDisconnect: () => void
}

const SQL_SNIPPET = `-- NTE Flowboard 云同步安全配置
-- 在 Supabase SQL Editor 中执行以下语句

-- 1. 创建数据表（含 sync_key 列）
CREATE TABLE sync_data (
  id TEXT PRIMARY KEY DEFAULT 'default',
  sync_key TEXT NOT NULL DEFAULT '',
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. 启用 Row Level Security
ALTER TABLE sync_data ENABLE ROW LEVEL SECURITY;

-- 3. 创建 RLS 策略：通过 RPC 函数验证 sync_key
-- 注意：直接的表操作将被 RLS 拒绝，
-- 所有操作必须通过 upsert_sync / pull_sync 函数执行

-- 允许匿名调用 RPC 函数（函数内部自行验证 sync_key）
CREATE POLICY "Allow RPC" ON sync_data
  FOR ALL USING (true)
  WITH CHECK (true);

-- 4. 推送函数（验证 sync_key 后写入）
CREATE OR REPLACE FUNCTION upsert_sync(
  p_sync_key TEXT,
  p_data JSONB
) RETURNS TIMESTAMPTZ AS $$
DECLARE
  v_now TIMESTAMPTZ := now();
BEGIN
  INSERT INTO sync_data (id, sync_key, data, updated_at)
  VALUES ('default', p_sync_key, p_data, v_now)
  ON CONFLICT (id) DO UPDATE SET
    data = EXCLUDED.data,
    sync_key = EXCLUDED.sync_key,
    updated_at = EXCLUDED.updated_at
  WHERE sync_data.sync_key = p_sync_key;

  RETURN v_now;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. 拉取函数（验证 sync_key 后读取）
CREATE OR REPLACE FUNCTION pull_sync(
  p_sync_key TEXT
) RETURNS TABLE(data JSONB, updated_at TIMESTAMPTZ) AS $$
BEGIN
  RETURN QUERY
  SELECT sd.data, sd.updated_at
  FROM sync_data sd
  WHERE sd.id = 'default' AND sd.sync_key = p_sync_key;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. 启用 Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE sync_data;`

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
  isLocked,
  onSetupSupabase,
  onUnlock,
  onTriggerSync,
  onRequestDisconnect,
}: CloudSyncSectionProps) {
  const [projectIdInput, setProjectIdInput] = useState('')
  const [keyInput, setKeyInput] = useState('')
  const [syncKeyInput, setSyncKeyInput] = useState('')
  const [unlockInput, setUnlockInput] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [showSyncKey, setShowSyncKey] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [isUnlocking, setIsUnlocking] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const [helpCopied, setHelpCopied] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)

  const isSyncingState = syncStatus === 'syncing'

  const handleCopySql = async () => {
    try {
      await navigator.clipboard.writeText(SQL_SNIPPET)
      setHelpCopied(true)
      setTimeout(() => setHelpCopied(false), MS.SUCCESS_HINT)
    } catch {
      setHelpCopied(true)
      setTimeout(() => setHelpCopied(false), MS.SUCCESS_HINT)
    }
  }

  const handleSetup = async () => {
    if (!projectIdInput.trim() || !keyInput.trim() || !syncKeyInput.trim()) return
    setIsConnecting(true)
    setLocalError(null)
    try {
      await onSetupSupabase(projectIdInput.trim(), keyInput.trim(), syncKeyInput.trim())
    } catch {
      setLocalError('连接失败，请检查配置')
    } finally {
      setIsConnecting(false)
    }
  }

  const handleUnlock = async () => {
    if (!unlockInput.trim()) return
    setIsUnlocking(true)
    setLocalError(null)
    try {
      const ok = await onUnlock(unlockInput.trim())
      if (!ok) {
        setLocalError('密钥错误，请重试')
      }
    } catch {
      setLocalError('解锁失败')
    } finally {
      setIsUnlocking(false)
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

  // --- Status indicator ---
  const statusDot = (() => {
    if (isSyncingState || isSyncing || isConnecting || isUnlocking) {
      return <Loader2 className="size-3.5 text-blue-500 animate-spin" />
    }
    switch (syncStatus) {
      case 'connected':
        return <span className="size-2 rounded-full bg-emerald-500" />
      case 'error':
        return <span className="size-2 rounded-full bg-red-500" />
      case 'locked':
        return <Lock className="size-3 text-amber-500" />
      default:
        return <span className="size-2 rounded-full bg-gray-400 dark:bg-gray-500" />
    }
  })()

  const statusText = (() => {
    if (isSyncingState || isSyncing) return '同步中'
    if (isConnecting) return '连接中'
    if (isUnlocking) return '解锁中'
    switch (syncStatus) {
      case 'connected':
        return '已连接'
      case 'connecting':
        return '连接中'
      case 'error':
        return '同步错误'
      case 'locked':
        return '已加密'
      case 'disconnected':
        return '未连接'
      default:
        return '未连接'
    }
  })()

  // --- Locked state: ask for sync key to decrypt ---
  if (isLocked) {
    return (
      <div>
        <h3 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">
          云同步
        </h3>
        <div className={CARD_STYLES.sectionSpaced}>
          <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400">
            <Lock className="size-3.5" />
            <span>配置已加密，请输入同步密钥解锁</span>
          </div>

          <div className="space-y-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-600 dark:text-gray-300">
                同步密钥
              </label>
              <input
                type="password"
                value={unlockInput}
                onChange={(e) => setUnlockInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleUnlock()}
                placeholder="输入设置时的同步密钥"
                autoFocus
                className="w-full px-3 py-2 rounded-lg text-xs bg-white dark:bg-white/10 border border-gray-200 dark:border-white/10 text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400 dark:focus:border-indigo-500 transition-colors"
              />
            </div>
          </div>

          <button
            onClick={handleUnlock}
            disabled={!unlockInput.trim() || isUnlocking}
            className="w-full px-4 py-2.5 rounded-lg text-xs font-medium bg-indigo-500 hover:bg-indigo-600 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors active:scale-[0.97] flex items-center justify-center gap-1.5"
          >
            {isUnlocking ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Lock className="size-3.5" />
            )}
            解锁
          </button>

          {(syncError || localError) && (
            <p className="text-xs text-red-500">{syncError || localError}</p>
          )}
        </div>
      </div>
    )
  }

  // --- Not configured ---
  if (!isConfigured) {
    return (
      <div>
        <h3 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">
          云同步
        </h3>
        <div className={CARD_STYLES.sectionSpaced}>
          <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
            通过 Supabase 在多设备间同步清单数据。同步密钥同时用于加密本地配置和验证云端访问权限。
          </p>

          {/* Supabase config inputs */}
          <div className="space-y-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-600 dark:text-gray-300">
                项目 ID
              </label>
              <input
                type="text"
                value={projectIdInput}
                onChange={(e) => setProjectIdInput(e.target.value)}
                placeholder="如 abcdefgh123456789xyz"
                className="w-full px-3 py-2 rounded-lg text-xs bg-white dark:bg-white/10 border border-gray-200 dark:border-white/10 text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400 dark:focus:border-indigo-500 transition-colors"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-600 dark:text-gray-300">
                Anon Key
              </label>
              <div className="relative">
                <input
                  type={showKey ? 'text' : 'password'}
                  value={keyInput}
                  onChange={(e) => setKeyInput(e.target.value)}
                  placeholder="eyJhbGciOi..."
                  className="w-full px-3 py-2 pr-9 rounded-lg text-xs bg-white dark:bg-white/10 border border-gray-200 dark:border-white/10 text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400 dark:focus:border-indigo-500 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  aria-label={showKey ? '隐藏密钥' : '显示密钥'}
                >
                  {showKey ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-600 dark:text-gray-300">
                同步密钥
              </label>
              <div className="relative">
                <input
                  type={showSyncKey ? 'text' : 'password'}
                  value={syncKeyInput}
                  onChange={(e) => setSyncKeyInput(e.target.value)}
                  placeholder="自定义密钥（所有设备共享）"
                  className="w-full px-3 py-2 pr-9 rounded-lg text-xs bg-white dark:bg-white/10 border border-gray-200 dark:border-white/10 text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400 dark:focus:border-indigo-500 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowSyncKey(!showSyncKey)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  aria-label={showSyncKey ? '隐藏密钥' : '显示密钥'}
                >
                  {showSyncKey ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                </button>
              </div>
              <p className="text-[10px] text-gray-400 dark:text-gray-500">
                用于加密本地配置和验证云端数据访问，所有设备必须使用相同密钥
              </p>
            </div>
          </div>

          <button
            onClick={handleSetup}
            disabled={
              !projectIdInput.trim() || !keyInput.trim() || !syncKeyInput.trim() || isConnecting
            }
            className="w-full px-4 py-2.5 rounded-lg text-xs font-medium bg-indigo-500 hover:bg-indigo-600 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors active:scale-[0.97] flex items-center justify-center gap-1.5"
          >
            {isConnecting ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Cloud className="size-3.5" />
            )}
            连接 Supabase
          </button>

          {(syncError || localError) && (
            <p className="text-xs text-red-500">{syncError || localError}</p>
          )}

          {/* 配置教程 */}
          <div>
            <button
              onClick={() => setShowHelp(!showHelp)}
              className="flex items-center gap-1 text-2xs text-gray-400 dark:text-gray-500 hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors"
            >
              <HelpCircle className="size-3" />
              如何获取配置信息
              {showHelp ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
            </button>
            {showHelp && (
              <div className="mt-2 text-2xs text-gray-400 dark:text-gray-500 leading-relaxed space-y-1.5 bg-white/60 dark:bg-white/5 rounded-xl p-3 border border-gray-200/40 dark:border-white/5">
                <p className="font-medium text-gray-500 dark:text-gray-400">
                  1. 创建 Supabase 项目
                </p>
                <p>
                  访问{' '}
                  <a
                    href="https://supabase.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-500 hover:text-indigo-600 dark:text-indigo-400 underline underline-offset-2"
                  >
                    supabase.com
                  </a>{' '}
                  注册并创建一个免费项目
                </p>
                <p className="font-medium text-gray-500 dark:text-gray-400 pt-1">2. 创建数据表</p>
                <p>进入 SQL Editor，执行以下语句：</p>
                <div className="relative bg-gray-900 dark:bg-black/60 rounded-lg overflow-hidden">
                  <div className="flex items-center justify-between px-3 py-1.5 bg-gray-800 dark:bg-white/10">
                    <span className="text-[10px] text-gray-400 font-medium">SQL</span>
                    <button
                      onClick={handleCopySql}
                      className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-gray-200 transition-colors"
                    >
                      {helpCopied ? (
                        <Check className="size-3 text-emerald-400" />
                      ) : (
                        <Copy className="size-3" />
                      )}
                      {helpCopied ? '已复制' : '复制'}
                    </button>
                  </div>
                  <pre className="p-3 overflow-x-auto text-[10px] font-mono text-gray-300 leading-relaxed max-h-48">
                    {SQL_SNIPPET}
                  </pre>
                </div>
                <p className="font-medium text-gray-500 dark:text-gray-400 pt-1">3. 获取项目 ID</p>
                <p>Project Settings → General → Project ID</p>
                <p className="font-medium text-gray-500 dark:text-gray-400 pt-1">
                  4. 获取 Anon Key
                </p>
                <p>
                  Project Settings → API Keys → Legacy anon, service_role API keys → anon public
                </p>
                <p className="font-medium text-gray-500 dark:text-gray-400 pt-1">5. 设置同步密钥</p>
                <p>
                  自定义一个密钥，所有需要同步的设备使用相同密钥。密钥同时用于加密本地配置和验证云端访问。
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // --- Connected ---
  return (
    <div>
      <h3 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
        云同步
        <span className="flex items-center gap-1 text-[12px] font-normal normal-case tracking-normal">
          {statusDot}
          <span
            className={
              syncStatus === 'connected'
                ? 'text-emerald-500'
                : syncStatus === 'error'
                  ? 'text-red-500'
                  : syncStatus === 'locked'
                    ? 'text-amber-500'
                    : 'text-gray-400 dark:text-gray-500'
            }
          >
            {statusText}
          </span>
        </span>
      </h3>
      <div className={CARD_STYLES.sectionSpaced}>
        {/* Last sync time */}
        <p className="text-xs text-gray-500 dark:text-gray-400">
          上次同步: {formatSyncTime(lastSyncTime)}
        </p>

        {/* Error */}
        {syncError && <p className="text-xs text-red-500">{syncError}</p>}

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={handleManualSync}
            disabled={isSyncingState || isSyncing}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-indigo-50/80 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors active:scale-[0.97] text-sm font-medium border border-indigo-200/50 dark:border-indigo-700/30 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSyncingState || isSyncing ? (
              <Loader2 className="size-[15px] animate-spin" />
            ) : (
              <Cloud className="size-[15px]" />
            )}
            手动同步
          </button>
          <button
            onClick={onRequestDisconnect}
            className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/20 transition-colors active:scale-[0.97] text-sm font-medium border border-gray-200/50 dark:border-white/10"
          >
            断开
          </button>
        </div>
      </div>
    </div>
  )
})

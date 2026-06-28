import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { SCALE_ENTRY, SCALE_EXIT } from '../../utils/motion'
import {
  Cloud,
  Eye,
  EyeOff,
  ChevronRight,
  ChevronDown,
  ClipboardPlus,
  ClipboardCheck,
  Database,
  ExternalLink,
  AlertCircle,
} from 'lucide-react'
import { cn } from '../../utils/cn'
import { GRID_COLLAPSE } from '../../utils/stylePresets'
import { Button } from '../base/Button'
import { Input } from '../base/Input'
import { Card } from '../base/Card'
import { StatusMessage } from '../base/StatusMessage'

const SQL_SNIPPET = `-- NTE Flowboard 云同步配置
-- 在 Supabase SQL Editor 中执行以下语句

-- 1. 创建数据表
CREATE TABLE sync_data (
  id TEXT PRIMARY KEY DEFAULT 'NTE Flowboard',
  data TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. 启用 Row Level Security
ALTER TABLE sync_data ENABLE ROW LEVEL SECURITY;

-- 3. 创建 RLS 策略（anon key 通过 RPC 访问，需要完全放行）
CREATE POLICY "Allow RPC" ON sync_data
  FOR ALL USING (true)
  WITH CHECK (true);

-- 4. 推送函数（upsert 单行数据）
CREATE OR REPLACE FUNCTION upsert_sync(p_data TEXT)
RETURNS TIMESTAMPTZ
LANGUAGE sql SECURITY DEFINER
AS $$
  INSERT INTO sync_data (id, data, updated_at)
  VALUES ('NTE Flowboard', p_data, now())
  ON CONFLICT (id) DO UPDATE SET
    data = EXCLUDED.data,
    updated_at = EXCLUDED.updated_at
  RETURNING updated_at;
$$;

-- 5. 拉取函数（返回最新数据）
CREATE OR REPLACE FUNCTION pull_sync()
RETURNS TABLE(data TEXT, updated_at TIMESTAMPTZ)
LANGUAGE sql SECURITY DEFINER
AS $$
  SELECT data, updated_at FROM sync_data WHERE id = 'NTE Flowboard';
$$;

-- 6. 启用 Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE sync_data;`

interface CloudSyncSetupProps {
  syncError: string | null
  onSetupSupabase: (projectId: string, anonKey: string) => Promise<void>
}

export function CloudSyncSetup({ syncError, onSetupSupabase }: CloudSyncSetupProps) {
  const [projectIdInput, setProjectIdInput] = useState('')
  const [anonKeyInput, setAnonKeyInput] = useState('')
  const [isAnonKeyVisible, setIsAnonKeyVisible] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)
  const [isSqlExpanded, setIsSqlExpanded] = useState(false)
  const [isCopied, setIsCopied] = useState(false)

  const handleSetup = async () => {
    if (!projectIdInput.trim() || !anonKeyInput.trim()) return
    setIsConnecting(true)
    setLocalError(null)
    const start = Date.now()
    try {
      await onSetupSupabase(projectIdInput.trim(), anonKeyInput.trim())
    } catch {
      setLocalError('连接失败，请检查配置')
    } finally {
      const elapsed = Date.now() - start
      if (elapsed < 500) await new Promise((resolve) => setTimeout(resolve, 500 - elapsed))
      setIsConnecting(false)
    }
  }

  const handleCopySql = () => {
    navigator.clipboard.writeText(SQL_SNIPPET)
    setIsCopied(true)
    setTimeout(() => setIsCopied(false), 2000)
  }

  return (
    <div className="space-y-4">
      <Card variant="surface" className="px-4 py-3">
        <p className="text-xs font-medium text-text-primary">
          通过 Supabase 在多设备间同步清单数据
        </p>
      </Card>

      <Card variant="surface" className="px-4 py-3 space-y-3">
        <div className="space-y-3">
          <Input
            label="项目 ID"
            type="text"
            value={projectIdInput}
            onChange={(event) => setProjectIdInput(event.target.value)}
            placeholder="abcdefgh123456789xyz"
            autoComplete="off"
          />
          <Input
            label="Anon Key"
            type={isAnonKeyVisible ? 'text' : 'password'}
            value={anonKeyInput}
            onChange={(event) => setAnonKeyInput(event.target.value)}
            placeholder="eyJhbGciOi..."
            autoComplete="off"
            suffix={
              <button
                type="button"
                onClick={() => setIsAnonKeyVisible((prev) => !prev)}
                aria-label={isAnonKeyVisible ? '隐藏密钥' : '显示密钥'}
                className="p-0 text-text-muted hover:text-text-primary transition-colors duration-200"
              >
                {isAnonKeyVisible ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
              </button>
            }
          />
        </div>
        <Button
          onClick={handleSetup}
          disabled={!projectIdInput.trim() || !anonKeyInput.trim()}
          isLoading={isConnecting}
          className="w-full justify-center"
        >
          <Cloud className="size-3.5" /> 连接 Supabase
        </Button>
        <div
          className={cn(
            'grid transition-[grid-template-rows,opacity] duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)]',
            (syncError || localError) && !isConnecting
              ? 'grid-rows-[1fr] opacity-100'
              : 'grid-rows-[0fr] opacity-0',
          )}
        >
          <div className="overflow-hidden min-h-0">
            <StatusMessage tone="danger" mode="callout" icon={<AlertCircle className="size-4" />}>
              {syncError || localError}
            </StatusMessage>
          </div>
        </div>
      </Card>

      <Card
        variant="surface"
        className="px-4 py-3 text-[13px] text-text-secondary leading-relaxed space-y-3"
      >
        <div>
          <p className="font-medium text-text-primary mb-1">1.创建 Supabase 项目</p>
          <p>
            访问{' '}
            <a
              href="https://supabase.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors duration-200"
            >
              supabase.com
              <ExternalLink className="size-3" />
            </a>{' '}
            注册并创建一个免费项目
          </p>
        </div>
        <div>
          <p className="font-medium text-text-primary mb-1">2.创建数据表</p>
          <p className="mb-2">复制下方 SQL 至 Supabase SQL Editor 运行</p>
          <div className="relative bg-surface rounded-xl overflow-hidden">
            <div
              role="button"
              tabIndex={0}
              onClick={() => setIsSqlExpanded((prev) => !prev)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  setIsSqlExpanded((prev) => !prev)
                }
              }}
              className={cn(
                'flex items-center justify-between px-3 py-1.5 w-full cursor-pointer',
                isSqlExpanded ? '' : 'rounded-xl',
              )}
            >
              <span className="flex items-center gap-1.5 text-[11px] text-text-muted font-medium font-mono">
                <Database className="size-3" />
                SQL 建表脚本
                <ChevronDown
                  className={cn(
                    'size-3 transition-transform duration-150',
                    !isSqlExpanded && '-rotate-90',
                  )}
                />
              </span>
              <span onClick={(event) => event.stopPropagation()}>
                <button
                  type="button"
                  onClick={handleCopySql}
                  aria-label={isCopied ? '已复制' : '复制 SQL'}
                  className={cn(
                    'inline-flex items-center justify-center size-6 rounded-lg border border-border',
                    'transition-colors duration-200',
                    isCopied
                      ? 'bg-success/15 text-success'
                      : 'text-text-muted hover:text-text-secondary hover:bg-surface-hover',
                  )}
                >
                  <AnimatePresence mode="wait">
                    {isCopied ? (
                      <motion.span
                        key="check"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8, transition: SCALE_EXIT }}
                        transition={SCALE_ENTRY}
                        className="inline-flex"
                      >
                        <ClipboardCheck className="size-3.5" />
                      </motion.span>
                    ) : (
                      <motion.span
                        key="copy"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8, transition: SCALE_EXIT }}
                        transition={SCALE_ENTRY}
                        className="inline-flex"
                      >
                        <ClipboardPlus className="size-3.5" />
                      </motion.span>
                    )}
                  </AnimatePresence>
                </button>
              </span>
            </div>
            <div
              className={cn(GRID_COLLAPSE, isSqlExpanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]')}
            >
              <div className="overflow-hidden">
                <pre className="px-3 pb-3 pt-1 text-[11px] font-mono text-text-secondary leading-relaxed max-h-56 whitespace-pre-wrap break-words overflow-y-auto">
                  {SQL_SNIPPET}
                </pre>
              </div>
            </div>
          </div>
        </div>
        <div>
          <p className="font-medium text-text-primary mb-1">3.获取项目 ID</p>
          <div className="flex items-center gap-1 text-xs text-text-secondary flex-wrap">
            <Path>Project Settings</Path>
            <ChevronRight className="size-3 text-text-muted" />
            <Path>General</Path>
            <ChevronRight className="size-3 text-text-muted" />
            <Path>Project ID</Path>
          </div>
        </div>
        <div>
          <p className="font-medium text-text-primary mb-1">4.获取 Anon Key</p>
          <div className="flex items-center gap-1 text-xs text-text-secondary flex-wrap">
            <Path>Project Settings</Path>
            <ChevronRight className="size-3 text-text-muted" />
            <Path>API Keys</Path>
            <ChevronRight className="size-3 text-text-muted" />
            <Path>Legacy anon</Path>
            <ChevronRight className="size-3 text-text-muted" />
            <Path>anon public</Path>
          </div>
        </div>
        <div>
          <p className="font-medium text-text-primary mb-1">5.完成</p>
          <p>回到网站输入 Project ID 和 Anon Key 即可连接</p>
        </div>
      </Card>
    </div>
  )
}

function Path({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded-xl bg-elevated text-[11px] font-mono text-text-primary border border-border">
      {children}
    </span>
  )
}

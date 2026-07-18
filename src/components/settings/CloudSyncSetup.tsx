import { useEffect, useRef, useState } from 'react'
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
  Loader2,
} from 'lucide-react'
import { cn } from '../../utils/cn'
import { GRID_COLLAPSE } from '../../utils/stylePresets'
import { Button } from '../base/Button'
import { Input } from '../base/Input'
import { Card } from '../base/Card'

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

-- 6. 自动维护 updated_at（兼容未来直写表）
CREATE OR REPLACE FUNCTION set_sync_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_data_set_updated_at ON sync_data;
CREATE TRIGGER sync_data_set_updated_at
  BEFORE UPDATE ON sync_data
  FOR EACH ROW
  EXECUTE FUNCTION set_sync_updated_at();

-- 7. 启用 Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE sync_data;`

interface CloudSyncSetupProps {
  syncError: string | null
  onSetupSupabase: (projectUrl: string, anonKey: string) => Promise<void>
}

type ButtonPhase = 'idle' | 'loading' | 'error'

export function CloudSyncSetup({ syncError, onSetupSupabase }: CloudSyncSetupProps) {
  const [projectUrlInput, setProjectUrlInput] = useState('')
  const [anonKeyInput, setAnonKeyInput] = useState('')
  const [isAnonKeyVisible, setIsAnonKeyVisible] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)
  const [isSqlExpanded, setIsSqlExpanded] = useState(false)
  const [isCopied, setIsCopied] = useState(false)
  const [buttonPhase, setButtonPhase] = useState<ButtonPhase>('idle')
  const [buttonErrorMessage, setButtonErrorMessage] = useState<string | null>(null)
  const [isMarqueeNeeded, setIsMarqueeNeeded] = useState(false)
  const [marqueeDistance, setMarqueeDistance] = useState(0)
  const [shouldStartMarquee, setShouldStartMarquee] = useState(false)
  const awaitingRequestResultRef = useRef(false)
  const hasClearedErrorSinceRequestRef = useRef(false)
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const marqueeStartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const marqueeViewportRef = useRef<HTMLSpanElement | null>(null)
  const marqueeTrackRef = useRef<HTMLSpanElement | null>(null)

  useEffect(() => {
    const errorMessage = syncError || localError

    if (awaitingRequestResultRef.current) {
      if (!errorMessage) {
        hasClearedErrorSinceRequestRef.current = true
        if (!isConnecting) {
          awaitingRequestResultRef.current = false
          setButtonPhase('idle')
        }
        return
      }

      if (!hasClearedErrorSinceRequestRef.current) {
        return
      }
    }

    if (!errorMessage) return

    if (feedbackTimerRef.current) {
      clearTimeout(feedbackTimerRef.current)
      feedbackTimerRef.current = null
    }

    setButtonErrorMessage(errorMessage)
    setButtonPhase('error')
    awaitingRequestResultRef.current = false

    if (isConnecting) return

    feedbackTimerRef.current = setTimeout(() => {
      setButtonErrorMessage(null)
      setButtonPhase('idle')
      feedbackTimerRef.current = null
    }, 2000)

    return () => {
      if (feedbackTimerRef.current) {
        clearTimeout(feedbackTimerRef.current)
        feedbackTimerRef.current = null
      }
    }
  }, [isConnecting, localError, syncError])

  const clearButtonFeedback = () => {
    if (feedbackTimerRef.current) {
      clearTimeout(feedbackTimerRef.current)
      feedbackTimerRef.current = null
    }
    if (marqueeStartTimerRef.current) {
      clearTimeout(marqueeStartTimerRef.current)
      marqueeStartTimerRef.current = null
    }
    setButtonErrorMessage(null)
    setButtonPhase('idle')
    setIsMarqueeNeeded(false)
    setMarqueeDistance(0)
    setShouldStartMarquee(false)
    awaitingRequestResultRef.current = false
    hasClearedErrorSinceRequestRef.current = false
  }

  useEffect(() => {
    if (!buttonErrorMessage) {
      if (marqueeStartTimerRef.current) {
        clearTimeout(marqueeStartTimerRef.current)
        marqueeStartTimerRef.current = null
      }
      setIsMarqueeNeeded(false)
      setMarqueeDistance(0)
      setShouldStartMarquee(false)
      return
    }

    const measureOverflow = () => {
      const viewport = marqueeViewportRef.current
      const track = marqueeTrackRef.current
      if (!viewport || !track) return

      const overflow = track.scrollWidth - viewport.clientWidth
      if (overflow > 8) {
        setIsMarqueeNeeded(true)
        setMarqueeDistance(overflow)
        setShouldStartMarquee(false)
        if (marqueeStartTimerRef.current) clearTimeout(marqueeStartTimerRef.current)
        marqueeStartTimerRef.current = setTimeout(() => {
          setShouldStartMarquee(true)
          marqueeStartTimerRef.current = null
        }, 260)
      } else {
        setIsMarqueeNeeded(false)
        setMarqueeDistance(0)
        setShouldStartMarquee(false)
      }
    }

    measureOverflow()

    const resizeObserver = new ResizeObserver(() => {
      measureOverflow()
    })

    if (marqueeViewportRef.current) resizeObserver.observe(marqueeViewportRef.current)
    if (marqueeTrackRef.current) resizeObserver.observe(marqueeTrackRef.current)

    return () => {
      resizeObserver.disconnect()
      if (marqueeStartTimerRef.current) {
        clearTimeout(marqueeStartTimerRef.current)
        marqueeStartTimerRef.current = null
      }
    }
  }, [buttonErrorMessage])

  const handleSetup = async () => {
    if (buttonPhase !== 'idle' || !projectUrlInput.trim() || !anonKeyInput.trim()) return
    clearButtonFeedback()
    awaitingRequestResultRef.current = true
    hasClearedErrorSinceRequestRef.current = false
    setIsConnecting(true)
    setButtonPhase('loading')
    setLocalError(null)
    const start = Date.now()
    try {
      await onSetupSupabase(projectUrlInput.trim(), anonKeyInput.trim())
      setButtonPhase('idle')
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

      <Card variant="surface" className="px-4 py-3">
        <div className="space-y-3">
          <Input
            label="Project URL"
            type="url"
            value={projectUrlInput}
            onChange={(event) => {
              clearButtonFeedback()
              setProjectUrlInput(event.target.value)
            }}
            placeholder="https://xxx.supabase.co"
            autoComplete="off"
          />
          <Input
            label="Publishable Key"
            type={isAnonKeyVisible ? 'text' : 'password'}
            value={anonKeyInput}
            onChange={(event) => {
              clearButtonFeedback()
              setAnonKeyInput(event.target.value)
            }}
            placeholder="sb_publishable_..."
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
          disabled={isConnecting || !projectUrlInput.trim() || !anonKeyInput.trim()}
          aria-disabled={buttonPhase !== 'idle' || !projectUrlInput.trim() || !anonKeyInput.trim()}
          tabIndex={buttonPhase === 'error' ? -1 : undefined}
          variant={buttonPhase === 'error' ? 'danger-soft' : 'primary'}
          className={cn(
            'mt-3 w-full justify-center hover:brightness-100 hover:shadow-md',
            buttonPhase === 'error' &&
              'cursor-not-allowed hover:bg-danger/10 hover:text-danger hover:brightness-100',
          )}
          contentClassName={
            buttonPhase === 'error' ? 'w-full justify-center overflow-hidden' : undefined
          }
        >
          <AnimatePresence mode="wait" initial={false}>
            {buttonPhase === 'loading' ? (
              <motion.span
                key="loading-label"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4, transition: SCALE_EXIT }}
                transition={SCALE_ENTRY}
                className="inline-flex items-center gap-1.5"
              >
                <Loader2 className="size-3.5 animate-spin" />
                <span>连接中</span>
              </motion.span>
            ) : buttonPhase === 'error' && buttonErrorMessage ? (
              <motion.span
                key={buttonErrorMessage}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4, transition: SCALE_EXIT }}
                transition={SCALE_ENTRY}
                className="block w-full"
              >
                <span
                  ref={marqueeViewportRef}
                  className="relative block w-full overflow-hidden whitespace-nowrap"
                >
                  <motion.span
                    ref={marqueeTrackRef}
                    animate={
                      isMarqueeNeeded && shouldStartMarquee
                        ? { x: [0, -marqueeDistance] }
                        : { x: 0 }
                    }
                    transition={
                      isMarqueeNeeded && shouldStartMarquee
                        ? {
                            x: {
                              duration: Math.max(1.8, marqueeDistance / 36),
                              ease: 'linear',
                              repeat: Infinity,
                              repeatType: 'reverse',
                              repeatDelay: 0.35,
                              delay: 0.25,
                            },
                          }
                        : undefined
                    }
                    className={cn(
                      'inline-block text-sm leading-snug',
                      isMarqueeNeeded && shouldStartMarquee ? 'text-left' : 'w-full text-center',
                    )}
                  >
                    {buttonErrorMessage}
                  </motion.span>
                </span>
              </motion.span>
            ) : (
              <motion.span
                key="connect-label"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4, transition: SCALE_EXIT }}
                transition={SCALE_ENTRY}
                className="inline-flex items-center gap-1.5"
              >
                <Cloud className="size-3.5" />
                <span>连接 Supabase</span>
              </motion.span>
            )}
          </AnimatePresence>
        </Button>
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
          <p className="font-medium text-text-primary mb-1">3.获取连接信息</p>
          <div className="flex items-center gap-1 text-xs text-text-secondary flex-wrap">
            <Path>Dashboard 主界面</Path>
            <ChevronRight className="size-3 text-text-muted" />
            <Path>Copy</Path>
            <ChevronRight className="size-3 text-text-muted" />
            <Path>Project URL</Path>
            <span>和</span>
            <Path>Publishable key</Path>
          </div>
        </div>
        <div>
          <p className="font-medium text-text-primary mb-1">4.完成</p>
          <p>回到网站输入 Project URL 和 Publishable Key 即可连接</p>
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

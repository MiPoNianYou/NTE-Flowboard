import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Cloud, LogOut, AlertCircle } from 'lucide-react'
import type { SyncStatus } from '../../types'
import { cn } from '../../utils/cn'
import { APPLE_EASE } from '../../utils/motion'
import { Button } from '../base/Button'
import { Card } from '../base/Card'
import { StatusMessage } from '../base/StatusMessage'

interface CloudSyncStatusProps {
  syncStatus: SyncStatus
  lastSyncTime: string | null
  syncError: string | null
  onTriggerSync: () => Promise<void>
  onTeardownSupabase: () => void
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
    const diffHrs = Math.floor(diffMin / 60)
    if (diffHrs < 24) return `${diffHrs} 小时前`
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

export function CloudSyncStatus({
  syncStatus,
  lastSyncTime,
  syncError,
  onTriggerSync,
  onTeardownSupabase,
}: CloudSyncStatusProps) {
  const [isSyncing, setIsSyncing] = useState(false)
  const [isDisconnectExpanded, setIsDisconnectExpanded] = useState(false)
  const disconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isDisconnectHoveringRef = useRef(false)

  const clearDisconnectState = () => {
    if (isDisconnectHoveringRef.current) return
    if (disconnectTimerRef.current) {
      clearTimeout(disconnectTimerRef.current)
      disconnectTimerRef.current = null
    }
    setIsDisconnectExpanded(false)
  }

  useEffect(() => {
    return () => {
      if (disconnectTimerRef.current) clearTimeout(disconnectTimerRef.current)
    }
  }, [])

  const handleDisconnectClick = () => {
    if (isDisconnectExpanded) {
      clearDisconnectState()
      onTeardownSupabase()
    } else {
      setIsDisconnectExpanded(true)
      disconnectTimerRef.current = setTimeout(clearDisconnectState, 3000)
    }
  }

  const handleDisconnectEnter = () => {
    isDisconnectHoveringRef.current = true
    if (disconnectTimerRef.current) {
      clearTimeout(disconnectTimerRef.current)
      disconnectTimerRef.current = null
    }
  }

  const handleDisconnectLeave = () => {
    isDisconnectHoveringRef.current = false
    if (isDisconnectExpanded) {
      disconnectTimerRef.current = setTimeout(clearDisconnectState, 3000)
    }
  }

  const isLoading = isSyncing || syncStatus === 'syncing'

  const handleManualSync = async () => {
    setIsSyncing(true)
    const start = Date.now()
    try {
      await onTriggerSync()
    } finally {
      const elapsed = Date.now() - start
      if (elapsed < 500) await new Promise((resolve) => setTimeout(resolve, 500 - elapsed))
      setIsSyncing(false)
    }
  }

  const statusText = (() => {
    if (syncStatus === 'syncing' || isSyncing) return '同步中'
    switch (syncStatus) {
      case 'connected':
        return '已连接'
      case 'error':
        return '出错了'
      default:
        return '未连接'
    }
  })()

  return (
    <div>
      <Card variant="surface" className="flex flex-col items-center py-5 px-4">
        <div className="flex flex-col items-center">
          <div
            className={cn(
              'relative size-10 rounded-full flex items-center justify-center',
              isLoading && 'bg-info/15',
              !isLoading && syncStatus === 'connected' && 'bg-success/15',
              !isLoading && syncStatus === 'error' && 'bg-danger/15',
              !isLoading && syncStatus === 'disconnected' && 'bg-text-muted/15',
            )}
          >
            {isLoading ? (
              <span className="size-3.5 rounded-full bg-info animate-ripple" />
            ) : (
              <span
                className={cn(
                  'size-3.5 rounded-full',
                  syncStatus === 'connected' && 'bg-success animate-breathe',
                  syncStatus === 'error' && 'bg-danger animate-blink',
                  syncStatus === 'disconnected' && 'bg-text-muted',
                )}
              />
            )}
          </div>
          <p className="text-sm text-text-secondary mt-3">
            <span
              className={cn(
                'font-medium',
                isLoading && 'text-info',
                !isLoading && syncStatus === 'connected' && 'text-success',
                !isLoading && syncStatus === 'error' && 'text-danger',
                !isLoading && syncStatus === 'disconnected' && 'text-text-secondary',
              )}
            >
              {statusText}
            </span>
            <span className="mx-1.5 opacity-40">·</span>
            上次同步: {formatSyncTime(lastSyncTime)}
          </p>
        </div>
        <AnimatePresence initial={false}>
          {syncError && !isSyncing && (
            <motion.div
              key="sync-error"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{
                height: 0,
                opacity: 0,
                transition: {
                  height: { duration: 0.24, ease: APPLE_EASE },
                  opacity: { duration: 0.18, ease: APPLE_EASE },
                },
              }}
              transition={{
                height: { duration: 0.3, ease: APPLE_EASE },
                opacity: { duration: 0.22, ease: APPLE_EASE },
              }}
              className="w-full overflow-hidden"
            >
              <div className="pt-3">
                <StatusMessage
                  tone="danger"
                  mode="callout"
                  icon={<AlertCircle className="size-3.5" />}
                  className="px-3.5 py-2.5 gap-2.5"
                >
                  {syncError}
                </StatusMessage>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div className="flex gap-2 w-full mt-6">
          <Button
            variant="primary-soft"
            onClick={handleManualSync}
            disabled={syncStatus === 'syncing'}
            isLoading={isSyncing}
            className="flex-1 justify-center"
          >
            <Cloud className="size-[15px]" /> 手动同步
          </Button>
          <button
            className={cn('button-disconnect', isDisconnectExpanded && 'expanded')}
            onClick={handleDisconnectClick}
            onMouseEnter={handleDisconnectEnter}
            onMouseLeave={handleDisconnectLeave}
            aria-label="断开连接"
          >
            <span className="sign">
              <LogOut size={18} />
            </span>
            <span className="text">确认断开？</span>
          </button>
        </div>
      </Card>
    </div>
  )
}

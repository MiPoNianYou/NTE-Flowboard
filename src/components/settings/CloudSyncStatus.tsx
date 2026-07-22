import { useState, useEffect, useRef } from 'react'
import type { TFunction } from 'i18next'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'motion/react'
import {
  Cloud,
  LogOut,
  AlertCircle,
  ClipboardPlus,
  ClipboardCheck,
  Database,
  ChevronDown,
  EyeOff,
} from 'lucide-react'
import type { SyncStatus } from '../../types'
import { cn } from '../../utils/cn'
import { APPLE_EASE } from '../../utils/motion'
import { useSettings } from '../../context/SettingsContext'
import { useDisplayPreferences } from '../../context/DisplayPreferencesContext'
import { Button } from '../base/Button'
import { Card } from '../base/Card'
import { StatusMessage } from '../base/StatusMessage'

const UPDATED_AT_PATCH_SQL = `CREATE OR REPLACE FUNCTION set_sync_updated_at()
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
  EXECUTE FUNCTION set_sync_updated_at();`
interface CloudSyncStatusProps {
  syncStatus: SyncStatus
  lastSyncTime: string | null
  syncError: string | null
  onTriggerSync: () => Promise<void>
  onTeardownSupabase: () => void
}

function formatSyncTime(
  isoString: string | null,
  locale: string,
  timeFormat: '24h' | '12h',
  t: TFunction,
): string {
  if (!isoString) return t('cloud.never')
  try {
    const date = new Date(isoString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMin = Math.floor(diffMs / 60000)
    if (diffMin < 1) return t('cloud.justNow')
    if (diffMin < 60) return t('cloud.minutesAgo', { count: diffMin })
    const diffHrs = Math.floor(diffMin / 60)
    if (diffHrs < 24) return t('cloud.hoursAgo', { count: diffHrs })
    return new Intl.DateTimeFormat(locale, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: timeFormat === '12h',
    }).format(date)
  } catch {
    return t('common.unknown')
  }
}

export function CloudSyncStatus({
  syncStatus,
  lastSyncTime,
  syncError,
  onTriggerSync,
  onTeardownSupabase,
}: CloudSyncStatusProps) {
  const { t } = useTranslation()
  const { uiPreferences, updateUiPreferences } = useSettings()
  const { locale, timeFormat } = useDisplayPreferences()
  const [isSyncing, setIsSyncing] = useState(false)
  const [isDisconnectExpanded, setIsDisconnectExpanded] = useState(false)
  const [isPatchExpanded, setIsPatchExpanded] = useState(false)
  const [isPatchCopied, setIsPatchCopied] = useState(false)
  const [isPatchHideExpanded, setIsPatchHideExpanded] = useState(false)
  const disconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const patchCopiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const patchHideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isDisconnectHoveringRef = useRef(false)
  const isPatchHideHoveringRef = useRef(false)

  const clearDisconnectState = () => {
    if (isDisconnectHoveringRef.current) return
    if (disconnectTimerRef.current) {
      clearTimeout(disconnectTimerRef.current)
      disconnectTimerRef.current = null
    }
    setIsDisconnectExpanded(false)
  }

  const clearPatchHideState = () => {
    if (isPatchHideHoveringRef.current) return
    if (patchHideTimerRef.current) {
      clearTimeout(patchHideTimerRef.current)
      patchHideTimerRef.current = null
    }
    setIsPatchHideExpanded(false)
  }

  useEffect(() => {
    return () => {
      if (disconnectTimerRef.current) clearTimeout(disconnectTimerRef.current)
      if (patchCopiedTimerRef.current) clearTimeout(patchCopiedTimerRef.current)
      if (patchHideTimerRef.current) clearTimeout(patchHideTimerRef.current)
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

  const handleCopyPatchSql = () => {
    navigator.clipboard.writeText(UPDATED_AT_PATCH_SQL)
    setIsPatchCopied(true)
    if (patchCopiedTimerRef.current) clearTimeout(patchCopiedTimerRef.current)
    patchCopiedTimerRef.current = setTimeout(() => {
      setIsPatchCopied(false)
      patchCopiedTimerRef.current = null
    }, 2000)
  }

  const handleHidePatchCard = () => {
    if (isPatchHideExpanded) {
      clearPatchHideState()
      updateUiPreferences({ cloudPatchHidden: true })
      return
    }

    setIsPatchHideExpanded(true)
    patchHideTimerRef.current = setTimeout(clearPatchHideState, 3000)
  }

  const handlePatchHideEnter = () => {
    isPatchHideHoveringRef.current = true
    if (patchHideTimerRef.current) {
      clearTimeout(patchHideTimerRef.current)
      patchHideTimerRef.current = null
    }
  }

  const handlePatchHideLeave = () => {
    isPatchHideHoveringRef.current = false
    if (isPatchHideExpanded) {
      patchHideTimerRef.current = setTimeout(clearPatchHideState, 3000)
    }
  }

  const statusText = (() => {
    if (syncStatus === 'syncing' || isSyncing) return t('cloud.statusSyncing')
    switch (syncStatus) {
      case 'connected':
        return t('cloud.statusConnected')
      case 'error':
        return t('cloud.statusError')
      default:
        return t('cloud.statusDisconnected')
    }
  })()

  return (
    <div className="space-y-4">
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
            {t('cloud.lastSync', {
              time: formatSyncTime(lastSyncTime, locale, timeFormat, t),
            })}
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
            <Cloud className="size-[15px]" /> {t('cloud.manualSync')}
          </Button>
          <button
            className={cn(
              'danger-confirm-button danger-confirm-button--default',
              isDisconnectExpanded && 'expanded',
            )}
            onClick={handleDisconnectClick}
            onMouseEnter={handleDisconnectEnter}
            onMouseLeave={handleDisconnectLeave}
            aria-label={t('cloud.disconnect')}
          >
            <span className="sign">
              <LogOut size={18} />
            </span>
            <span className="text danger-confirm-text">{t('cloud.confirmDisconnect')}</span>
          </button>
        </div>
      </Card>

      {!uiPreferences.cloudPatchHidden && (
        <Card
          variant="surface"
          className="px-4 py-3 text-[13px] text-text-secondary leading-relaxed space-y-3"
        >
          <div className="relative">
            <div className="min-w-0 flex-1 pr-12">
              <p className="font-medium text-text-primary mb-1">{t('cloud.patchTitle')}</p>
              <p>{t('cloud.patchDescription')}</p>
            </div>
            <button
              className={cn(
                'danger-confirm-button danger-confirm-button--compact',
                isPatchHideExpanded && 'expanded',
              )}
              style={{ position: 'absolute', top: 0, right: 0 }}
              onClick={handleHidePatchCard}
              onMouseEnter={handlePatchHideEnter}
              onMouseLeave={handlePatchHideLeave}
              aria-label={isPatchHideExpanded ? t('cloud.confirmHidePatch') : t('cloud.hidePatch')}
            >
              <span className="sign">
                <EyeOff size={18} />
              </span>
              <span className="text danger-confirm-text leading-none">
                {t('cloud.confirmHide')}
              </span>
            </button>
          </div>

          <div className="relative bg-surface rounded-xl overflow-hidden">
            <div
              role="button"
              tabIndex={0}
              onClick={() => setIsPatchExpanded((prev) => !prev)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  setIsPatchExpanded((prev) => !prev)
                }
              }}
              className="flex items-center justify-between px-3 py-1.5 w-full cursor-pointer"
            >
              <span className="flex items-center gap-1.5 text-[11px] text-text-muted font-medium font-mono">
                <Database className="size-3" />
                {t('cloud.patchSqlLabel')}
                <ChevronDown
                  className={cn(
                    'size-3 transition-transform duration-150',
                    !isPatchExpanded && '-rotate-90',
                  )}
                />
              </span>
              <span onClick={(event) => event.stopPropagation()}>
                <button
                  type="button"
                  onClick={handleCopyPatchSql}
                  aria-label={isPatchCopied ? t('common.copied') : t('cloud.copyPatchSql')}
                  className={cn(
                    'inline-flex items-center justify-center size-6 rounded-lg border border-border transition-colors duration-200',
                    isPatchCopied
                      ? 'bg-success/15 text-success'
                      : 'text-text-muted hover:text-text-secondary hover:bg-surface-hover',
                  )}
                >
                  {isPatchCopied ? (
                    <ClipboardCheck className="size-3.5" />
                  ) : (
                    <ClipboardPlus className="size-3.5" />
                  )}
                </button>
              </span>
            </div>

            <div
              className={cn(
                'grid transition-all duration-200 ease-out',
                isPatchExpanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
              )}
            >
              <div className="overflow-hidden">
                <pre className="px-3 pb-3 pt-1 text-[11px] font-mono text-text-secondary leading-relaxed max-h-56 whitespace-pre-wrap break-words overflow-y-auto">
                  {UPDATED_AT_PATCH_SQL}
                </pre>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}

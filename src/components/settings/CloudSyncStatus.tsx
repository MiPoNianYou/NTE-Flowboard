import { useState, useEffect, useId, useRef } from 'react'
import type { TFunction } from 'i18next'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'motion/react'
import { Cloud, LogOut, AlertCircle, ChevronDown, EyeOff } from 'lucide-react'
import type { SyncStatus } from '../../types'
import { cn } from '../../utils/cn'
import { APPLE_EASE } from '../../utils/motion'
import { useSettings } from '../../context/SettingsContext'
import { useDisplayPreferences } from '../../context/DisplayPreferencesContext'
import { Button } from '../base/Button'
import { Card } from '../base/Card'
import { StatusMessage } from '../base/StatusMessage'
import { SqlCodeBlock } from './SqlCodeBlock'

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
  mobile?: boolean
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
  mobile = false,
}: CloudSyncStatusProps) {
  const { t } = useTranslation()
  const { uiPreferences, updateUiPreferences } = useSettings()
  const { locale, timeFormat } = useDisplayPreferences()
  const [isSyncing, setIsSyncing] = useState(false)
  const [isDisconnectExpanded, setIsDisconnectExpanded] = useState(false)
  const [isMobilePatchExpanded, setIsMobilePatchExpanded] = useState(false)
  const [isPatchHideExpanded, setIsPatchHideExpanded] = useState(false)
  const mobilePatchContentId = useId()
  const disconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
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
      <Card
        variant="surface"
        disableHoverScale={mobile}
        className={cn('flex flex-col items-center px-4 py-5', mobile && 'mobile-settings-surface')}
      >
        <div className="flex flex-col items-center">
          <div
            className={cn(
              'relative size-10 rounded-pill flex items-center justify-center',
              isLoading && 'bg-info/15',
              !isLoading && syncStatus === 'connected' && 'bg-success/15',
              !isLoading && syncStatus === 'error' && 'bg-danger/15',
              !isLoading && syncStatus === 'disconnected' && 'bg-text-muted/15',
            )}
          >
            {isLoading ? (
              <span className="size-3.5 rounded-pill bg-info animate-ripple" />
            ) : (
              <span
                className={cn(
                  'size-3.5 rounded-pill',
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
          disableHoverScale={mobile}
          className={cn(
            'px-4 text-xs leading-relaxed text-text-secondary',
            mobile ? 'py-0' : 'space-y-3 py-3',
            mobile && 'mobile-settings-surface',
          )}
        >
          {mobile && (
            <button
              type="button"
              onClick={() => setIsMobilePatchExpanded((expanded) => !expanded)}
              aria-expanded={isMobilePatchExpanded}
              aria-controls={mobilePatchContentId}
              className="flex min-h-14 w-full items-center justify-between gap-3 text-left text-text-primary"
            >
              <span className="text-sm font-semibold">{t('cloud.patchTitle')}</span>
              <ChevronDown
                aria-hidden="true"
                className={cn(
                  'size-4 flex-shrink-0 transition-transform duration-150',
                  !isMobilePatchExpanded && '-rotate-90',
                )}
              />
            </button>
          )}
          <div
            id={mobilePatchContentId}
            className={cn(
              'space-y-3',
              mobile && !isMobilePatchExpanded && 'hidden',
              mobile && isMobilePatchExpanded && 'mobile-settings-divider py-3',
            )}
          >
            <div className="relative">
              <div className="min-w-0 flex-1 pr-12">
                <p className="text-sm font-semibold text-text-primary mb-1">
                  {t('cloud.patchTitle')}
                </p>
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
                aria-label={
                  isPatchHideExpanded ? t('cloud.confirmHidePatch') : t('cloud.hidePatch')
                }
              >
                <span className="sign">
                  <EyeOff size={18} />
                </span>
                <span className="text danger-confirm-text leading-none">
                  {t('cloud.confirmHide')}
                </span>
              </button>
            </div>

            <SqlCodeBlock
              label={t('cloud.patchSqlLabel')}
              copyLabel={t('cloud.copyPatchSql')}
              content={UPDATED_AT_PATCH_SQL}
            />
          </div>
        </Card>
      )}
    </div>
  )
}

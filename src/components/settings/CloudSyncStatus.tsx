import { useState, useEffect, useId, useRef } from 'react'
import type { TFunction } from 'i18next'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'motion/react'
import {
  AlertCircle,
  ChevronDown,
  CloudAlert,
  CloudCheck,
  CloudOff,
  LogOut,
  RefreshCw,
  TriangleAlert,
} from 'lucide-react'
import type { SyncStatus } from '../../types'
import { cn } from '../../utils/cn'
import { APPLE_EASE } from '../../utils/motion'
import { useLocalUiPreferences } from '../../context/LocalUiPreferencesContext'
import { Button } from '../base/Button'
import { Card } from '../base/Card'
import { StatusMessage } from '../base/StatusMessage'
import { SettingRow } from './SettingRow'
import { SqlCodeBlock } from './SqlCodeBlock'
import type {
  CloudBackgroundSyncStatus,
  CloudSynchronizationCommandResult,
} from '../../utils/cloudSynchronization'
import { BACKGROUND_SYNC_PATCH_SQL } from '../../utils/cloudSyncSql'
interface CloudSyncStatusProps {
  syncStatus: SyncStatus
  backgroundSyncStatus: CloudBackgroundSyncStatus
  lastSyncTime: string | null
  syncError: string | null
  hasPendingLocalChanges: boolean
  requiresDatabaseUpgrade: boolean
  onTriggerSync: () => Promise<CloudSynchronizationCommandResult>
  onTeardownSupabase: () => void
  mobile?: boolean
}

function getBackgroundSyncPresentation(status: CloudBackgroundSyncStatus, t: TFunction) {
  switch (status) {
    case 'checking':
      return {
        label: t('cloud.backgroundSync.checking'),
        Icon: RefreshCw,
        pending: true,
        tone: 'neutral' as const,
      }
    case 'pending':
      return {
        label: t('cloud.backgroundSync.pending'),
        Icon: RefreshCw,
        pending: true,
        tone: 'neutral' as const,
      }
    case 'conflict':
      return {
        label: t('cloud.backgroundSync.conflict'),
        Icon: CloudAlert,
        pending: false,
        tone: 'warning' as const,
      }
    case 'upgrade-required':
      return {
        label: t('cloud.backgroundSync.upgradeRequired'),
        Icon: CloudAlert,
        pending: false,
        tone: 'warning' as const,
      }
    case 'capability-unknown':
      return {
        label: t('cloud.backgroundSync.capabilityUnknown'),
        Icon: CloudAlert,
        pending: false,
        tone: 'warning' as const,
      }
    case 'preserved-other-project':
      return {
        label: t('cloud.backgroundSync.preservedOtherProject'),
        Icon: CloudAlert,
        pending: false,
        tone: 'warning' as const,
      }
    case 'preserved-pending':
      return {
        label: t('cloud.backgroundSync.preservedPending'),
        Icon: CloudAlert,
        pending: false,
        tone: 'warning' as const,
      }
    case 'unsupported':
      return {
        label: t('cloud.backgroundSync.unsupported'),
        Icon: CloudOff,
        pending: false,
        tone: 'neutral' as const,
      }
    case 'blocked':
      return {
        label: t('cloud.backgroundSync.blocked'),
        Icon: CloudOff,
        pending: false,
        tone: 'warning' as const,
      }
    default:
      return {
        label: t('cloud.backgroundSync.ready'),
        Icon: CloudCheck,
        pending: false,
        tone: 'neutral' as const,
      }
  }
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

function getSyncPresentation(syncStatus: SyncStatus, isSyncing: boolean, t: TFunction) {
  if (isSyncing || syncStatus === 'syncing') {
    return {
      statusText: t('cloud.statusSyncing'),
      summaryText: t('cloud.syncingSummary'),
      Icon: RefreshCw,
      tone: 'info' as const,
      isPending: true,
    }
  }

  switch (syncStatus) {
    case 'connecting':
      return {
        statusText: t('cloud.connecting'),
        summaryText: t('cloud.connectingSummary'),
        Icon: RefreshCw,
        tone: 'info' as const,
        isPending: true,
      }
    case 'connected':
      return {
        statusText: t('cloud.statusConnected'),
        summaryText: t('cloud.dataUpToDate'),
        Icon: CloudCheck,
        tone: 'primary' as const,
        isPending: false,
      }
    case 'error':
      return {
        statusText: t('cloud.statusError'),
        summaryText: t('cloud.errorSummary'),
        Icon: CloudAlert,
        tone: 'danger' as const,
        isPending: false,
      }
    default:
      return {
        statusText: t('cloud.statusDisconnected'),
        summaryText: t('cloud.disconnectedSummary'),
        Icon: CloudOff,
        tone: 'muted' as const,
        isPending: false,
      }
  }
}

export function CloudSyncStatus({
  syncStatus,
  backgroundSyncStatus,
  lastSyncTime,
  syncError,
  hasPendingLocalChanges,
  requiresDatabaseUpgrade,
  onTriggerSync,
  onTeardownSupabase,
  mobile = false,
}: CloudSyncStatusProps) {
  const { t } = useTranslation()
  const { locale, timeFormat } = useLocalUiPreferences()
  const [isSyncing, setIsSyncing] = useState(false)
  const [isDisconnectExpanded, setIsDisconnectExpanded] = useState(false)
  const [isMobilePatchExpanded, setIsMobilePatchExpanded] = useState(false)
  const mobilePatchContentId = useId()
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

  const syncPresentation = getSyncPresentation(syncStatus, isSyncing, t)
  const StatusIcon = syncPresentation.Icon
  const backgroundPresentation = isSyncing
    ? {
        label: t('cloud.backgroundSync.manualSyncChecking'),
        Icon: RefreshCw,
        pending: true,
        tone: 'neutral' as const,
      }
    : getBackgroundSyncPresentation(backgroundSyncStatus, t)
  const disconnectPresentation = isDisconnectExpanded
    ? {
        label: hasPendingLocalChanges
          ? t('cloud.disconnectPendingTitle')
          : t('cloud.disconnectWarningTitle'),
        description: hasPendingLocalChanges
          ? t('cloud.disconnectPendingDescription')
          : t('cloud.disconnectWarningDescription'),
        Icon: TriangleAlert,
      }
    : null
  const BackgroundIcon = disconnectPresentation?.Icon ?? backgroundPresentation.Icon

  return (
    <div className="space-y-4">
      <Card
        variant="surface"
        disableHoverScale={mobile}
        className={cn('overflow-hidden', mobile && 'mobile-settings-surface')}
      >
        <div className="flex items-center gap-4 px-5 py-5">
          <div
            className={cn(
              'flex size-12 flex-shrink-0 items-center justify-center rounded-control',
              syncPresentation.tone === 'info' && 'bg-info/15 text-info',
              syncPresentation.tone === 'primary' && 'bg-primary/15 text-primary',
              syncPresentation.tone === 'danger' && 'bg-danger/15 text-danger',
              syncPresentation.tone === 'muted' && 'bg-text-muted/15 text-text-muted',
            )}
          >
            <StatusIcon
              className={cn('size-5', syncPresentation.isPending && 'animate-spin')}
              aria-hidden="true"
            />
          </div>
          <div className="min-w-0 flex-1">
            <span
              className={cn(
                'inline-flex rounded-pill px-2 py-0.5 text-xs font-medium',
                syncPresentation.tone === 'info' && 'bg-info/15 text-info',
                syncPresentation.tone === 'primary' && 'bg-primary/15 text-primary',
                syncPresentation.tone === 'danger' && 'bg-danger/15 text-danger',
                syncPresentation.tone === 'muted' && 'bg-text-muted/15 text-text-secondary',
              )}
            >
              {syncPresentation.statusText}
            </span>
            <p className="mt-2 text-base font-semibold text-text-primary">
              {syncPresentation.summaryText}
            </p>
            <p className="mt-1 text-xs text-text-secondary">
              {t('cloud.lastSync', {
                time: formatSyncTime(lastSyncTime, locale, timeFormat, t),
              })}
            </p>
          </div>
        </div>
        <AnimatePresence initial={false}>
          {syncError && !syncPresentation.isPending && (
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
              <div className="px-5 pb-4">
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
        <div className="border-t border-border">
          <SettingRow
            icon={BackgroundIcon}
            iconClassName={cn(
              disconnectPresentation && 'text-warning',
              !disconnectPresentation &&
                backgroundPresentation.tone === 'warning' &&
                'text-warning',
              !disconnectPresentation && backgroundPresentation.pending && 'animate-spin',
            )}
            iconTestId={disconnectPresentation ? 'disconnect-warning-icon' : undefined}
            label={disconnectPresentation?.label ?? t('cloud.backgroundSync.title')}
            description={disconnectPresentation?.description ?? backgroundPresentation.label}
            className="px-4 py-3"
          />
        </div>
        <div className="flex w-full gap-2 border-t border-border p-3">
          <Button
            variant="primary-soft"
            onClick={handleManualSync}
            disabled={syncStatus === 'syncing'}
            isLoading={isSyncing}
            className="flex-1 justify-center"
          >
            <RefreshCw className="size-[15px]" /> {t('cloud.manualSync')}
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

      {(backgroundSyncStatus === 'upgrade-required' || requiresDatabaseUpgrade) && (
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
            <div>
              <p className="text-sm font-semibold text-text-primary mb-1">
                {t('cloud.patchTitle')}
              </p>
              <p>{t('cloud.patchDescription')}</p>
            </div>

            <SqlCodeBlock
              label={t('cloud.patchSqlLabel')}
              copyLabel={t('cloud.copyPatchSql')}
              content={BACKGROUND_SYNC_PATCH_SQL}
            />
          </div>
        </Card>
      )}
    </div>
  )
}
